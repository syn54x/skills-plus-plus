// The Snapshot: what one batched GraphQL query says about an Epic and its Sub-issues.
// Pure: no network, filesystem or environment, so the epic board can import it.

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
  /** The head commit's full sha. */
  headSha: string;
  /**
   * The trailer of the pull request's `<!-- spp-verdict -->` comment, present only when one decodes:
   * `{ ticket, head, spec: "pass" | "fail", quality: "pass" | "fail" }`, as `spp verdict` writes it.
   */
  verdict?: Record<string, unknown>;
};

export const VERDICT_MARKER = "<!-- spp-verdict -->";

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
};

// Variables: $owner, $repo, $number. GitHub caps an Epic at 100 Sub-issues, so one page holds them all.
// Pull requests into an integration branch are not closing references, so they are found through cross-references.
// shortcut: the last 50 cross-references only; raise it if a Sub-issue is ever referenced more often than that.
// shortcut: Marker comments are looked for in the Epic's first 100 comments and a Sub-issue's first 50; both are
// written early (the plan, the claim), so raise these only if one is ever missed. The same holds for a pull request's
// verdict comment in its first 30, written at its first review and rewritten in place after that.
export const SNAPSHOT_QUERY = `query Snapshot($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      number url title repository { nameWithOwner }
      comments(first: 100) { nodes { body } }
      subIssues(first: 100) {
        nodes {
          number url title state repository { nameWithOwner }
          labels(first: 50) { nodes { name } }
          assignees(first: 20) { nodes { login } }
          blockedBy(first: 50) { nodes { url state } }
          comments(first: 50) { nodes { body } }
          closedByPullRequestsReferences(first: 20, includeClosedPrs: true) { nodes { ...pr } }
          timelineItems(last: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
            nodes { ... on CrossReferencedEvent { source { ... on PullRequest { ...pr body } } } }
          }
        }
      }
    }
  }
}
fragment pr on PullRequest { number url state headRefOid repository { nameWithOwner } comments(first: 30) { nodes { body } } }`;

type Nodes<T> = { nodes: T[] };
type RawPr = {
  number: number;
  url: string;
  state: PrState;
  headRefOid: string;
  repository: { nameWithOwner: string };
  body?: string;
  comments?: Nodes<{ body: string }>;
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
  comments?: Nodes<{ body: string }>;
};
type Response = {
  data?: { repository: { issue: (Omit<RawIssue, "state"> & { subIssues: Nodes<RawIssue> }) | null } | null };
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

// The trailer of the first comment that starts with the marker; null when there is none or it does not decode.
function markerData(comments: Nodes<{ body: string }> | undefined, marker: string): Record<string, unknown> | null {
  const c = comments?.nodes.find((n) => n.body.startsWith(marker));
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

function issue(raw: RawIssue): SnapshotIssue {
  const crossRefs = raw.timelineItems.nodes
    .map((e) => e.source)
    .filter((s): s is RawPr => !!s?.headRefOid && closes(s.body ?? "", s.repository!.nameWithOwner, raw));
  const prs = new Map<string, Pr>();
  for (const p of [...raw.closedByPullRequestsReferences.nodes, ...crossRefs]) {
    const verdict = markerData(p.comments, VERDICT_MARKER);
    prs.set(p.url, { number: p.number, url: p.url, state: p.state, headSha: p.headRefOid, ...(verdict && { verdict }) });
  }
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
    progress: markerData(raw.comments, "<!-- sdd-progress -->"),
  };
}

export function parseSnapshot(json: unknown): Snapshot {
  const r = json as Response;
  const epic = r?.data?.repository?.issue;
  if (epic === null) throw new Error("epic not found");
  if (!epic) throw new Error(r?.errors?.[0]?.message ?? "unexpected response from GitHub");
  return {
    epic: { number: epic.number, url: epic.url, repo: epic.repository.nameWithOwner, title: epic.title },
    issues: epic.subIssues.nodes.map(issue),
    plan: markerData(epic.comments, "<!-- sdd-plan -->"),
  };
}
