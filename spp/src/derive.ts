// derive: the EpicState computed from a Snapshot. Pure: no network, filesystem or environment.
import type { Pr, Snapshot, SnapshotIssue } from "./snapshot.ts";

/**
 * Where a Sub-issue stands, the first that fits: `merged` (the issue is closed), `handed-back` (unheld, with a route
 * label), `pr-open`, `gate-pass` or `gate-fail` (an open pull request, by the slice gate's verdict on its current
 * head), `claimed` (held by the Claim mark or an assignee), `blocked` (an open blocker), `not-agent` (no
 * `ready-for-agent` label), else `ready`.
 */
export type TicketState = "blocked" | "ready" | "claimed" | "pr-open" | "gate-pass" | "gate-fail" | "merged" | "handed-back" | "not-agent";

/** One Sub-issue of the Epic. */
export type Ticket = {
  /** The issue number. */
  number: number;
  /** The issue URL, which names the ticket everywhere else in the state. */
  url: string;
  /** The issue's repository, `owner/repo`. */
  repo: string;
  /** The issue title. */
  title: string;
  /** The size its `size:` label gives, or null without one. */
  size: "S" | "M" | "L" | null;
  /** Where the ticket stands. */
  state: TicketState;
  /** The Layer: one above its highest open blocker inside the Epic, 0 with none; null when caught in a cycle. */
  layer: number | null;
  /** URLs of open blockers. */
  blockedBy: string[];
  /** Whether it carries the Claim mark (the `claimed` label); an assignee also holds a ticket. */
  claimed: boolean;
  /** Assignee logins. */
  assignees: string[];
  /** Label names. */
  labels: string[];
  /** The pull request it shows (an open one first, then a merged one, newest first), or null. */
  pr: Pr | null;
  /** The progress comment's Worker line, or null. */
  worker: string | null;
  /** The latest local note (`spp note`) with its ISO time, or null. */
  note: { text: string; at: string } | null;
};

/** An Epic and its Sub-issues as one snapshot derives them: the `--json` shape of `spp status`. */
export type EpicState = {
  /** The Epic; `branch` is the integration branch its plan comment records, or null. */
  epic: { number: number; url: string; repo: string; title: string; branch: string | null };
  /** Every Sub-issue. */
  tickets: Ticket[];
  /** Issue URLs by Layer, Layer 0 first. */
  layers: string[][];
  /** Issue URLs caught in a blocking cycle. */
  cycle: string[];
  /** How many tickets are in each state. */
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
  const held = i.labels.includes("claimed") || i.assignees.length > 0;
  // A Hand-back clears the claim and may leave its pull request open; the route label wins over that pull request.
  if (!held && i.labels.some((l) => HANDED_BACK.includes(l))) return "handed-back";
  if (pr?.state === "OPEN") return gateOf(pr);
  if (held) return "claimed";
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
