// derive: the EpicState computed from a Snapshot. Pure: no network, filesystem or environment.
import type { Pr, Snapshot, SnapshotIssue } from "./snapshot.ts";

export type TicketState = "blocked" | "ready" | "claimed" | "pr-open" | "gate-pass" | "gate-fail" | "merged" | "handed-back" | "not-agent";

export type Ticket = {
  number: number;
  url: string;
  repo: string;
  title: string;
  size: "S" | "M" | "L" | null;
  state: TicketState;
  layer: number | null;
  blockedBy: string[]; // URLs of open blockers
  claimed: boolean; // the Claim mark (the `claimed` label); an assignee also holds a ticket
  assignees: string[];
  labels: string[];
  pr: Pr | null;
  worker: string | null;
  note: { text: string; at: string } | null;
};

export type EpicState = {
  epic: { number: number; url: string; repo: string; title: string; branch: string | null };
  tickets: Ticket[];
  layers: string[][];
  cycle: string[];
  counts: Record<TicketState, number>;
};

const STATES: TicketState[] = ["blocked", "ready", "claimed", "pr-open", "gate-pass", "gate-fail", "merged", "handed-back", "not-agent"];
const HANDED_BACK = ["needs-info", "ready-for-human", "blocked"];
const PR_RANK: Record<Pr["state"], number> = { OPEN: 0, MERGED: 1, CLOSED: 2 };

// A Marker comment trailer field as shown: a non-empty string, else null (the trailers store "" for unset).
const text = (v: unknown) => (typeof v === "string" && v ? v : null);

// The pull request a ticket shows: an open one first, then a merged one, newest first.
const pickPr = (prs: Pr[]) => [...prs].sort((a, b) => PR_RANK[a.state] - PR_RANK[b.state] || b.number - a.number)[0] ?? null;

// The slice gate on an open pull request: its verdict counts only for the head it was given on (the full sha, or a
// prefix of at least 7 characters); a verdict on an older head leaves the pull request pr-open.
function gateOf(pr: Pr): TicketState {
  const v = pr.verdict;
  const head = text(v?.head);
  if (!v || !head || head.length < 7 || !pr.headSha.startsWith(head)) return "pr-open";
  if (v.spec === "fail" || v.quality === "fail") return "gate-fail";
  return v.spec === "pass" && v.quality === "pass" ? "gate-pass" : "pr-open";
}

// The states overlap (a claimed ticket keeps its mark through pr-open), so the first match wins.
function stateOf(i: SnapshotIssue, blockedBy: string[], pr: Pr | null): TicketState {
  // shortcut: a closed ticket counts as merged even without a merged pull request (closed by hand, not planned).
  if (i.state === "CLOSED") return "merged";
  if (pr?.state === "OPEN") return gateOf(pr);
  if (i.labels.includes("claimed") || i.assignees.length) return "claimed";
  if (i.labels.some((l) => HANDED_BACK.includes(l))) return "handed-back";
  if (blockedBy.length) return "blocked";
  if (!i.labels.includes("ready-for-agent")) return "not-agent";
  return "ready";
}

export function derive(s: Snapshot): EpicState {
  const tickets: Ticket[] = s.issues.map((i) => {
    const blockedBy = i.blockedBy.filter((b) => b.open).map((b) => b.url);
    const pr = pickPr(i.prs);
    const size = i.labels.find((l) => /^size:[SML]$/.test(l))?.slice(5) as Ticket["size"] | undefined;
    return {
      number: i.number,
      url: i.url,
      repo: i.repo,
      title: i.title,
      size: size ?? null,
      state: stateOf(i, blockedBy, pr),
      layer: null,
      blockedBy,
      claimed: i.labels.includes("claimed"),
      assignees: i.assignees,
      labels: i.labels,
      pr,
      worker: text(i.progress?.worker),
      note: null,
    };
  });

  // A layer holds the tickets whose open blockers all sit in lower layers. A blocker outside the Epic
  // still makes its ticket blocked but places it in no layer, so it never fakes a cycle.
  const inEpic = new Set(tickets.map((t) => t.url));
  const placed = new Set<string>();
  const layers: string[][] = [];
  let rest = tickets;
  for (;;) {
    const layer = rest.filter((t) => t.blockedBy.every((b) => placed.has(b) || !inEpic.has(b)));
    if (!layer.length) break;
    for (const t of layer) {
      t.layer = layers.length;
      placed.add(t.url);
    }
    layers.push(layer.map((t) => t.url));
    rest = rest.filter((t) => !placed.has(t.url));
  }

  const counts = Object.fromEntries(STATES.map((st) => [st, tickets.filter((t) => t.state === st).length])) as Record<TicketState, number>;
  return { epic: { ...s.epic, branch: text(s.plan?.branch) }, tickets, layers, cycle: rest.map((t) => t.url), counts };
}
