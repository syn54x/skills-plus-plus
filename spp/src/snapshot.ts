// The Snapshot: what one batched GraphQL query says about an Epic and its Sub-issues.
// Pure: no network, filesystem or environment, so the epic board can import it.
import { readVerdict, type Verdict, VERDICT_MARKER } from "./verdict.ts";

/** A pull request's state on GitHub. */
export type PrState = "OPEN" | "MERGED" | "CLOSED";
/** A pull request linked to a Sub-issue. */
export type Pr = {
  /** The pull request number. */
  number: number;
  /** The pull request URL. */
  url: string;
  /** Its state on GitHub. */
  state: PrState;
  /** Its repository, `owner/repo`, which may lie outside the Epic: any repository can say it closes an issue. */
  repo: string;
  /** The branch it merges into. */
  base: string;
  /** The head commit's full sha. */
  headSha: string;
  /**
   * Whether spp trusts its author: the gh user, or one GitHub marks OWNER, MEMBER or COLLABORATOR (ADR 0009), so a
   * stranger's fork pull request into the Epic's repository is never the ticket's.
   */
  trusted: boolean;
  /** The pull request's `<!-- spp-verdict -->` comment as `spp verdict` writes it, present only when it decodes. */
  verdict?: Verdict;
  /**
   * The issue URL the body's first `Refs #N`, `Refs owner/repo#N` or `Refs <issue URL>` names, or null without one.
   * A fix pull request names the Sub-issue it belongs to this way (ADR 0011).
   */
  refs: string | null;
};

export type SnapshotIssue = {
  number: number;
  url: string;
  repo: string;
  title: string;
  state: "OPEN" | "CLOSED";
  labels: string[];
  assignees: string[];
  blockedBy: { url: string; open: boolean }[];
  prs: Pr[]; // linked: GitHub's closing references plus cross-referencing pull requests whose body closes the issue
  progress: Record<string, unknown> | null; // the progress comment's data trailer; null without a readable one
};

export type Snapshot = {
  epic: { number: number; url: string; repo: string; title: string };
  issues: SnapshotIssue[];
  plan: Record<string, unknown> | null; // the Epic's plan comment's data trailer; null without a readable one
  wave: Record<string, unknown> | null; // the Epic's wave comment's data trailer, the same way
  /**
   * Every pull request into the Epic's integration branch, trusted or not, across the Epic's repos: the answers to
   * {@link pullRequestsArgs}, set by {@link withPullRequests}. The parser leaves it empty. derive picks the fixes out.
   */
  pullRequests: Pr[];
};

// Variables: $owner, $repo, $number. GitHub caps an Epic at 100 Sub-issues, so one page holds them all.
// Pull requests into an integration branch are not closing references, so they are found through cross-references.
// shortcut: the last 50 cross-references only; raise it if a Sub-issue is ever referenced more often than that.
// shortcut: Marker comments are looked for in the Epic's first 100 comments and a Sub-issue's first 50; both are
// written early (the plan, the claim), so raise these only if one is ever missed. The same holds for a pull request's
// verdict comment in its first 30, written at its first review and rewritten in place after that.
// `viewer` and each comment's and pull request's author are there for the trust boundary (ADR 0009).
export const SNAPSHOT_QUERY = `query Snapshot($owner: String!, $repo: String!, $number: Int!) {
  viewer { login }
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      number url title repository { nameWithOwner }
      comments(first: 100) { nodes { ...comment } }
      subIssues(first: 100) {
        nodes {
          number url title state repository { nameWithOwner }
          labels(first: 50) { nodes { name } }
          assignees(first: 20) { nodes { login } }
          blockedBy(first: 50) { nodes { url state } }
          comments(first: 50) { nodes { ...comment } }
          closedByPullRequestsReferences(first: 20, includeClosedPrs: true) { nodes { ...pr } }
          timelineItems(last: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
            nodes { ... on CrossReferencedEvent { source { ... on PullRequest { ...pr } } } }
          }
        }
      }
    }
  }
}
fragment pr on PullRequest { number url body state headRefOid baseRefName repository { nameWithOwner } author { login } authorAssociation comments(first: 30) { nodes { ...comment } } }
fragment comment on IssueComment { body author { login } authorAssociation }`;

type Nodes<T> = { nodes: T[] };
type Comment = { body: string; author?: { login: string } | null; authorAssociation?: string };
type RawPr = {
  number: number;
  url: string;
  state: PrState;
  headRefOid: string;
  baseRefName: string;
  repository: { nameWithOwner: string };
  author?: { login: string } | null;
  authorAssociation?: string;
  body?: string;
  comments?: Nodes<Comment>;
};
type RawIssue = {
  number: number;
  url: string;
  title: string;
  state: "OPEN" | "CLOSED";
  repository: { nameWithOwner: string };
  labels: Nodes<{ name: string }>;
  assignees: Nodes<{ login: string }>;
  blockedBy: Nodes<{ url: string; state: string }>;
  closedByPullRequestsReferences: Nodes<RawPr>;
  timelineItems: Nodes<{ source?: Partial<RawPr> }>;
  comments?: Nodes<Comment>;
};
type Response = {
  data?: { viewer?: { login: string }; repository: { issue: (Omit<RawIssue, "state"> & { subIssues: Nodes<RawIssue> }) | null } | null };
  errors?: { message: string }[];
};

// The data trailer of a Marker comment body (ADR 0007): {} when it has none, null when one is there but does not
// decode. Carriage returns are dropped; the last line that starts with `<!-- sdd-data:` once trimmed is the trailer,
// and only trailing whitespace is tolerated on it. It lives here rather than in markers.ts so that this module and
// derive import nothing from Node; markers.ts re-exports it.
export function readTrailer(body: string): Record<string, unknown> | null {
  const line = body.replace(/\r/g, "").split("\n").filter((l) => l.trim().startsWith("<!-- sdd-data:")).at(-1);
  if (line === undefined) return {};
  const m = /^<!-- sdd-data: ([A-Za-z0-9+/=]+) -->$/.exec(line.trimEnd());
  if (!m) return null;
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0))));
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The comment authors GitHub marks as holding a role on the repository; spp trusts their Marker comments (ADR 0009). */
export const TRUSTED_ASSOCIATIONS = ["OWNER", "MEMBER", "COLLABORATOR"];

/**
 * Whether spp may act on a Marker comment by this author: the gh user's own, or one GitHub marks OWNER, MEMBER or
 * COLLABORATOR. Anyone who can comment can post a marker, so every other author's is skipped (ADR 0009).
 */
export function trustedAuthor(login: string | null | undefined, association: string | null | undefined, viewer: string | null | undefined): boolean {
  return TRUSTED_ASSOCIATIONS.includes(association ?? "") || (!!login && login === viewer);
}

/**
 * The first comment from a trusted author that starts with the marker; an untrusted one before it is skipped, so a
 * forged comment can neither be read nor stand in the real writer's place.
 *
 * @internal
 */
export function trustedMarker<C extends Comment>(comments: C[] | undefined, marker: string, viewer: string | null | undefined): C | undefined {
  return comments?.find((c) => c.body.startsWith(marker) && trustedAuthor(c.author?.login, c.authorAssociation, viewer));
}

// The trailer of the first trusted comment that starts with the marker; null when there is none or it does not decode.
function markerData(comments: Nodes<Comment> | undefined, marker: string, viewer: string | null): Record<string, unknown> | null {
  const c = trustedMarker(comments?.nodes, marker, viewer);
  return c ? readTrailer(c.body) : null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GitHub's closing keywords and the space before the reference they close.
export const CLOSING_KEYWORD = String.raw`\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+`;

// A closing keyword followed by #N (same repo only), owner/repo#N or the issue URL.
function closes(body: string, prRepo: string, issue: RawIssue): boolean {
  const repo = issue.repository.nameWithOwner;
  const refs = [issue.url, `${repo}#${issue.number}`, ...(prRepo.toLowerCase() === repo.toLowerCase() ? [`#${issue.number}`] : [])];
  const pattern = String.raw`${CLOSING_KEYWORD}(?:${refs.map(escape).join("|")})(?![\w/])`;
  return new RegExp(pattern, "i").test(body);
}

function pr(p: RawPr, viewer: string | null): Pr {
  const verdict = readVerdict(markerData(p.comments, VERDICT_MARKER, viewer));
  const trusted = trustedAuthor(p.author?.login, p.authorAssociation, viewer);
  return { number: p.number, url: p.url, state: p.state, repo: p.repository.nameWithOwner, base: p.baseRefName, headSha: p.headRefOid, trusted, refs: refs(p.body ?? "", p.repository.nameWithOwner), ...(verdict && { verdict }) };
}

// The issue URL of the body's first `Refs` reference: #N (the pull request's own repo), owner/repo#N or an issue URL.
/** @internal */
export function refs(body: string, prRepo: string): string | null {
  const m = /\brefs:?\s+(?:https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+)|([\w.-]+\/[\w.-]+)#(\d+)|#(\d+))(?![\w/])/i.exec(body);
  return m ? `https://github.com/${m[1] ?? m[3] ?? prRepo}/issues/${m[2] ?? m[4] ?? m[5]}` : null;
}

function issue(raw: RawIssue, viewer: string | null): SnapshotIssue {
  const crossRefs = raw.timelineItems.nodes
    .map((e) => e.source)
    .filter((s): s is RawPr => !!s?.headRefOid && closes(s.body ?? "", s.repository!.nameWithOwner, raw));
  const prs = new Map<string, Pr>();
  for (const p of [...raw.closedByPullRequestsReferences.nodes, ...crossRefs]) prs.set(p.url, pr(p, viewer));
  return {
    number: raw.number,
    url: raw.url,
    repo: raw.repository.nameWithOwner,
    title: raw.title,
    state: raw.state,
    labels: raw.labels.nodes.map((l) => l.name),
    assignees: raw.assignees.nodes.map((a) => a.login),
    blockedBy: raw.blockedBy.nodes.map((b) => ({ url: b.url, open: b.state === "OPEN" })),
    prs: [...prs.values()],
    progress: markerData(raw.comments, "<!-- sdd-progress -->", viewer),
  };
}

/**
 * gh's arguments for an Epic's snapshot, the Epic given as an issue number (the current repo, through gh's
 * placeholders) or an issue URL; null for anything else.
 */
export function snapshotArgs(epic: string): string[] | null {
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/.exec(epic);
  const vars = /^\d+$/.test(epic) ? ["-F", "owner={owner}", "-F", "repo={repo}", "-F", `number=${epic}`] : m && ["-f", `owner=${m[1]}`, "-f", `repo=${m[2]}`, "-F", `number=${m[3]}`];
  return vars && ["api", "graphql", "-f", `query=${SNAPSHOT_QUERY}`, ...vars];
}

/**
 * gh's answer to {@link snapshotArgs} as a Snapshot. gh exits 1 on a missing issue but still prints the response,
 * which reads as "epic not found"; any other failure throws gh's stderr.
 */
export function readSnapshot(r: { exitCode: number | null; stdout: string; stderr: string }): Snapshot {
  let json: unknown;
  try {
    json = JSON.parse(r.stdout);
  } catch {}
  const missing = (json as Response | undefined)?.data?.repository?.issue === null;
  if (r.exitCode !== 0 && !missing) throw new Error(r.stderr.trim() || `gh exited ${r.exitCode}`);
  return parseSnapshot(json);
}

export function parseSnapshot(json: unknown): Snapshot {
  const r = json as Response;
  const epic = r?.data?.repository?.issue;
  if (epic === null) throw new Error("epic not found");
  if (!epic) throw new Error(r?.errors?.[0]?.message ?? "unexpected response from GitHub");
  const viewer = r.data?.viewer?.login ?? null; // the gh user, read in the same query so this stays pure
  return {
    epic: { number: epic.number, url: epic.url, repo: epic.repository.nameWithOwner, title: epic.title },
    issues: epic.subIssues.nodes.map((i) => issue(i, viewer)),
    plan: markerData(epic.comments, "<!-- sdd-plan -->", viewer),
    wave: markerData(epic.comments, "<!-- sdd-wave -->", viewer),
    pullRequests: [],
  };
}

// Variables: $owner, $repo, $branch. Open and merged only: a pull request closed without merging is no fix (ADR 0011).
// shortcut: the first 100 pull requests into the branch, newest first; page if an Epic ever runs more fixes than that.
const PULL_REQUESTS_QUERY = `query PullRequests($owner: String!, $repo: String!, $branch: String!) {
  viewer { login }
  repository(owner: $owner, name: $repo) {
    pullRequests(baseRefName: $branch, states: [OPEN, MERGED], first: 100, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { ...pr } }
  }
}
fragment pr on PullRequest { number url body state headRefOid baseRefName repository { nameWithOwner } author { login } authorAssociation comments(first: 30) { nodes { ...comment } } }
fragment comment on IssueComment { body author { login } authorAssociation }`;

/**
 * gh's argument lists for the pull requests into the Epic's integration branch, one per repo of the Epic: its own,
 * each Sub-issue's and each the plan comment's `repos` names, lowercased and deduped, in that order. Empty when the
 * plan records no branch, and a name that is not `owner/repo` gets no request. The gh user comes back in each
 * answer for the trust boundary (ADR 0009). The caller runs each and hands the parsed answers to
 * {@link withPullRequests}.
 */
export function pullRequestsArgs(s: Snapshot): string[][] {
  const branch = s.plan?.branch;
  if (typeof branch !== "string" || !branch) return [];
  return fixRepos(s).map((r) => {
    const [owner, name] = r.split("/");
    return ["api", "graphql", "-f", `query=${PULL_REQUESTS_QUERY}`, "-f", `owner=${owner}`, "-f", `repo=${name}`, "-f", `branch=${branch}`];
  });
}

/**
 * The repos {@link pullRequestsArgs} asks, in its order: the Epic's, each Sub-issue's and each the plan comment's
 * `repos` names, lowercased and deduped, leaving out a name that is not `owner/repo`. Pairs with the argument lists
 * by index, so a caller can name the repo a request was for.
 */
export function fixRepos(s: Snapshot): string[] {
  const planned = Array.isArray(s.plan?.repos) ? s.plan.repos.filter((r): r is string => typeof r === "string") : [];
  const repos = new Set([s.epic.repo, ...s.issues.map((i) => i.repo), ...planned].map((r) => r.toLowerCase()));
  return [...repos].filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r));
}

/** The snapshot with its pull requests set to the parsed answers to {@link pullRequestsArgs}, flattened; `s` is left as it was. */
export function withPullRequests(s: Snapshot, answers: Pr[][]): Snapshot {
  return { ...s, pullRequests: answers.flat() };
}

/**
 * gh's answer to one list of {@link pullRequestsArgs}: every pull request listed, trusted or not. Throws gh's stderr
 * on failure.
 */
export function readPullRequests(r: { exitCode: number | null; stdout: string; stderr: string }): Pr[] {
  if (r.exitCode !== 0) throw new Error(r.stderr.trim() || `gh exited ${r.exitCode}`);
  const data = (JSON.parse(r.stdout) as { data?: { viewer?: { login: string }; repository?: { pullRequests: Nodes<RawPr> } | null } }).data;
  const viewer = data?.viewer?.login ?? null;
  return (data?.repository?.pullRequests.nodes ?? []).map((p) => pr(p, viewer));
}

// Open issues with Sub-issues, each with the comments that can hold its plan (written early, so the first 100 do), most recently updated first so a busy repo's first page holds the live ones.
const EPICS_QUERY = `query Epics($owner: String!, $repo: String!) {
  viewer { login }
  repository(owner: $owner, name: $repo) {
    issues(states: OPEN, first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { number url title subIssuesSummary { total completed } comments(first: 100) { nodes { ...comment } } }
    }
  }
}
fragment comment on IssueComment { body author { login } authorAssociation }`;

/**
 * gh's arguments for the current repo's open issues that have Sub-issues, with the gh user for the trust boundary.
 *
 * @internal
 */
export function epicsArgs(): string[] {
  return ["api", "graphql", "-f", `query=${EPICS_QUERY}`, "-F", "owner={owner}", "-F", "repo={repo}"];
}

/** An Epic with Sub-issues not all completed; `branch` is its integration branch, null without a trusted plan comment. */
type EpicInFlight = { number: number; url: string; title: string; total: number; completed: number; branch: string | null };

/**
 * gh's answer to {@link epicsArgs}: the issues whose Sub-issues are not all completed, each with the integration
 * branch from its first trusted plan comment; `all` keeps the completed ones too. Throws gh's first stderr line on failure.
 *
 * @internal
 */
export function readEpics(r: { exitCode: number | null; stdout: string; stderr?: string }, all = false): EpicInFlight[] {
  if (r.exitCode !== 0) throw new Error((r.stderr ?? "").trim().split("\n")[0] || `gh exited ${r.exitCode}`);
  type Raw = { number: number; url: string; title: string; subIssuesSummary: { total: number; completed: number }; comments?: Nodes<Comment> };
  const data = (JSON.parse(r.stdout) as { data?: { viewer?: { login: string }; repository?: { issues: Nodes<Raw> } } }).data;
  const viewer = data?.viewer?.login ?? null;
  return (data?.repository?.issues.nodes ?? [])
    .filter((i) => i.subIssuesSummary.total > 0 && (all || i.subIssuesSummary.completed < i.subIssuesSummary.total))
    .map((i) => {
      const branch = markerData(i.comments, "<!-- sdd-plan -->", viewer)?.branch;
      const { total, completed } = i.subIssuesSummary;
      return { number: i.number, url: i.url, title: i.title, total, completed, branch: typeof branch === "string" ? branch : null };
    });
}
