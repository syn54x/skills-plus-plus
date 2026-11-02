// The next actions of a build, from the EpicState and what the command read around it (CI, verdict history, the pull
// request to the base branch, the session list, the wave). Pure: no network, filesystem or environment.
import type { EpicState, Ticket } from "./derive.ts";
import type { Routing } from "./routing.ts";
import type { PrState } from "./snapshot.ts";

export type ActionKind = "preflight" | "branch" | "dispatch" | "gate" | "fix" | "hand-back" | "merge" | "wait" | "main-gate" | "close" | "stuck";
export type Action = { kind: ActionKind; tickets?: string[]; pr?: string; driver?: "desktop" | "bg" | "subagent"; panel?: boolean; reason: string };

// One entry of `claude agents --json --all`: background sessions carry `state`, interactive ones `status`.
export type Session = { name?: string; state?: string; status?: string };

export type NextInput = {
  state: EpicState;
  panel: Routing["panel"];
  driver: "bg" | "subagent"; // spp sees the messaging socket or not; desktop detection is the skill's
  sessions: Session[];
  wave: { wave: string[]; held: { ticket: string; reason: string }[] }; // over the dispatchable ready tickets
  checks: Record<string, string>; // by pull request URL: pass, fail, pending or none
  failedHeads: Record<string, number>; // by pull request URL: the heads a verdict failed, across the comment's edits
  mainPr: { url: string; state: PrState; lines: number } | null; // the pull request from the integration branch
};

const ENDED = ["done", "failed", "stopped"];

// A ticket's dispatched worker is a live session named after it: the progress comment's worker, or t-<N>.
export function liveWorker(t: Ticket, sessions: Session[]): Session | undefined {
  const names = [t.worker, `t-${t.number}`];
  return sessions.find((s) => s.name && names.includes(s.name) && !ENDED.includes(s.state ?? ""));
}

// A merged pull request into the integration branch does not close its ticket, so it counts as merged too.
const done = (t: Ticket) => t.state === "merged" || t.pr?.state === "MERGED";

export function planNext(input: NextInput): Action[] {
  const { state, panel, sessions, checks, failedHeads, mainPr } = input;
  const ref = (url: string) => {
    const [, repo, n] = /([^/]+\/[^/]+)\/(?:issues|pull)\/(\d+)$/.exec(url) ?? [, url, ""];
    return repo === state.epic.repo ? `#${n}` : `${repo}#${n}`;
  };
  // A ticket as spp dispatch and the other commands take it: its number in the Epic's repo, else its URL.
  const id = (t: Ticket) => (t.repo === state.epic.repo ? String(t.number) : t.url);

  if (state.tickets.every(done)) {
    if (mainPr?.state === "MERGED") return [{ kind: "close", pr: mainPr.url, reason: `${ref(mainPr.url)} merged into the base branch` }];
    const open = mainPr?.state === "OPEN" ? mainPr : null;
    const why = [
      state.tickets.length >= panel.tickets && `${state.tickets.length} tickets (${panel.tickets} or more)`,
      panel.sizeL && state.tickets.some((t) => t.size === "L") && "a size L ticket",
      open && open.lines >= panel.lines && `${open.lines} changed lines (${panel.lines} or more)`,
    ].filter(Boolean);
    const lines = open ? `${open.lines} changed lines` : "changed lines are counted once the pull request is open; run spp next again then";
    return [
      {
        kind: "main-gate",
        ...(open && { pr: open.url }),
        panel: why.length > 0,
        reason: `every ticket merged; ${open ? `review ${ref(open.url)}` : "open the pull request to the base branch"}; ${why.length ? `panel: ${why.join(", ")}` : `no panel: ${state.tickets.length} tickets, no size L, ${lines}`}`,
      },
    ];
  }

  const byUrl = new Map(state.tickets.map((t) => [t.url, t]));
  const order = [...state.layers.flat(), ...state.cycle].map((u) => byUrl.get(u)!);
  const actions: Action[] = [];
  const inFlight: string[] = [];
  const idle: string[] = [];

  const ready = new Map(state.tickets.map((t) => [t.repo === state.epic.repo ? String(t.number) : `${t.repo}#${t.number}`, t]));
  const wave = input.wave.wave.map((w) => ready.get(w)!);
  if (wave.length) actions.push({ kind: "dispatch", tickets: wave.map(id), driver: input.driver, reason: `${wave.length} ready ticket(s) can run together` });
  for (const h of input.wave.held) idle.push(`${ref(ready.get(h.ticket)!.url)} held: ${h.reason}`);

  for (const t of order) {
    if (done(t)) continue;
    const pr = t.pr?.url ?? "";
    const one = { tickets: [id(t)], pr };
    if (t.state === "ready") {
      const s = liveWorker(t, sessions);
      if (s) inFlight.push(`${ref(t.url)} dispatched (${s.name} ${s.state ?? s.status ?? "running"})`);
    } else if (t.state === "claimed") {
      const s = liveWorker(t, sessions);
      inFlight.push(`${ref(t.url)} claimed${s ? ` (${s.name} ${s.state ?? s.status ?? "running"})` : t.worker ? ` by ${t.worker}` : ""}`);
    } else if (t.state === "pr-open") {
      const c = checks[pr] ?? "pending";
      // shortcut: none (no CI configured) gates like pass, as spp merge does; a repo whose CI registers late could gate early.
      if (c === "pass" || c === "none") actions.push({ kind: "gate", ...one, reason: `${ref(pr)} checks ${c}, no verdict on its head` });
      else inFlight.push(`${ref(t.url)} ${ref(pr)} checks ${c}`);
    } else if (t.state === "gate-fail") {
      const rounds = Math.max(0, (failedHeads[pr] ?? 1) - 1);
      if (rounds < 1) actions.push({ kind: "fix", ...one, reason: `${ref(pr)} failed its gate; one fix round by the same worker` });
      else actions.push({ kind: "hand-back", ...one, reason: `${ref(pr)} failed its gate again after its fix round` });
    } else if (t.state === "gate-pass") {
      const waiting = t.blockedBy.filter((b) => !(byUrl.get(b) && done(byUrl.get(b)!)));
      if (!waiting.length) actions.push({ kind: "merge", ...one, reason: `${ref(pr)} passed its gate and its blockers merged` });
      else idle.push(`${ref(t.url)} passed its gate and waits on ${waiting.map(ref).join(", ")}`);
    } else if (t.state === "not-agent") idle.push(`${ref(t.url)} has no ready-for-agent label`);
    else if (t.state === "handed-back") idle.push(`${ref(t.url)} is handed back`);
    else if (t.state === "blocked" && t.layer !== null) idle.push(`${ref(t.url)} is blocked by ${t.blockedBy.map(ref).join(", ")}`);
  }

  if (actions.length) return actions;
  if (inFlight.length) return [{ kind: "wait", reason: `in flight: ${inFlight.join("; ")}${idle.length ? `; also ${idle.join("; ")}` : ""}` }];
  const cycle = state.cycle.length ? [`cycle: ${state.cycle.map(ref).join(", ")}`] : [];
  return [{ kind: "stuck", reason: `nothing ready and nothing in flight: ${[...cycle, ...idle].join("; ")}` }];
}
