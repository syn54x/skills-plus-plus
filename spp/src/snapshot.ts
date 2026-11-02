// The Snapshot: what one batched GraphQL query says about an Epic and its Sub-issues.
// Pure: no network, filesystem or environment, so the epic board can import it.

export type PrState = "OPEN" | "MERGED" | "CLOSED";
export type Pr = { number: number; url: string; state: PrState; headSha: string };

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
};

export type Snapshot = {
  epic: { number: number; url: string; repo: string; title: string };
  issues: SnapshotIssue[];
};

// Variables: $owner, $repo, $number. GitHub caps an Epic at 100 Sub-issues, so one page holds them all.
// Pull requests into an integration branch are not closing references, so they are found through cross-references.
// shortcut: the last 50 cross-references only; raise it if a Sub-issue is ever referenced more often than that.
export const SNAPSHOT_QUERY = `query Snapshot($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      number url title repository { nameWithOwner }
      subIssues(first: 100) {
        nodes {
          number url title state repository { nameWithOwner }
          labels(first: 50) { nodes { name } }
          assignees(first: 20) { nodes { login } }
          blockedBy(first: 50) { nodes { url state } }
          closedByPullRequestsReferences(first: 20, includeClosedPrs: true) { nodes { ...pr } }
          timelineItems(last: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
            nodes { ... on CrossReferencedEvent { source { ... on PullRequest { ...pr body } } } }
          }
        }
      }
    }
  }
}
fragment pr on PullRequest { number url state headRefOid repository { nameWithOwner } }`;

type Nodes<T> = { nodes: T[] };
type RawPr = { number: number; url: string; state: PrState; headRefOid: string; repository: { nameWithOwner: string }; body?: string };
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
};
type Response = {
  data?: { repository: { issue: (Omit<RawIssue, "state"> & { subIssues: Nodes<RawIssue> }) | null } | null };
  errors?: { message: string }[];
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GitHub's closing keywords, followed by #N (same repo only), owner/repo#N or the issue URL.
function closes(body: string, prRepo: string, issue: RawIssue): boolean {
  const repo = issue.repository.nameWithOwner;
  const refs = [issue.url, `${repo}#${issue.number}`, ...(prRepo.toLowerCase() === repo.toLowerCase() ? [`#${issue.number}`] : [])];
  const pattern = String.raw`\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+(?:${refs.map(escape).join("|")})(?![\w/])`;
  return new RegExp(pattern, "i").test(body);
}

function issue(raw: RawIssue): SnapshotIssue {
  const crossRefs = raw.timelineItems.nodes
    .map((e) => e.source)
    .filter((s): s is RawPr => !!s?.headRefOid && closes(s.body ?? "", s.repository!.nameWithOwner, raw));
  const prs = new Map<string, Pr>();
  for (const p of [...raw.closedByPullRequestsReferences.nodes, ...crossRefs]) {
    prs.set(p.url, { number: p.number, url: p.url, state: p.state, headSha: p.headRefOid });
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
  };
}
