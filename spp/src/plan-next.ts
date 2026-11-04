// The next actions of a build, from the EpicState and what the command read around it (CI, verdict history, the pull
// request to the base branch, the session list, the wave). Pure: no network, filesystem or environment.
import { type Driver, type EpicState, refIn, type Ticket } from "./derive.ts";
import type { Routing } from "./routing.ts";
import type { PrState } from "./snapshot.ts";

/** What the build does next: fix a precondition, cut the branch, start workers, gate, fix, hand back, merge, wait, gate the pull request to the base branch, close the Epic, or stop as stuck. */
export type ActionKind = "preflight" | "branch" | "dispatch" | "gate" | "fix" | "hand-back" | "merge" | "wait" | "main-gate" | "close" | "stuck";
/** One next action of the build. */
export type Action = {
  /** What to do. */
  kind: ActionKind;
  /** The tickets it is about, for `dispatch`, `gate`, `fix`, `hand-back` and `merge`. */
  tickets?: string[];
  /** The pull request URL it is about. */
  pr?: string;
  /** How to start the workers, on `dispatch`. */
  driver?: Driver;
  /** On `main-gate`: whether the Epic is large enough for the review panel. */
  panel?: boolean;
  /** Why, in a sentence. */
  reason: string;
};

// How many ready tickets one Wave starts at most, unless `spp wave plan --max` says otherwise.
export const DEFAULT_WAVE_MAX = 4;

// One entry of `claude agents --json --all`: background sessions carry `state`, interactive ones `status`.
export type Session = { name?: string; state?: string; status?: string };

export type NextInput = {
  state: EpicState;
  panel: Routing["panel"];
  driver: Driver; // the plan comment's recorded Driver, else bg or subagent from the messaging socket
  sessions: Session[];
  wave: { wave: string[]; held: { ticket: string; reason: string }[] }; // over the dispatchable ready tickets
  checks: Record<string, { result: string; failing: string[] }>; // by pull request URL: pass, fail, pending or none, and the failing runs
  failedHeads: Record<string, number>; // by pull request URL: the heads a verdict or CI failed on, from GitHub
  mainPr: { url: string; state: PrState; lines: number } | null; // the pull request from the integration branch
};

// A background session working or waiting on a person, or an interactive one mid-turn.
const LIVE = ["working", "blocked", "busy"];

// A ticket's live worker: a running session named after it, the progress comment's worker or t-<N>.
export function liveWorker(t: Ticket, sessions: Session[]): Session | undefined {
  const names = [t.worker, `t-${t.number}`];
  return sessions.find((s) => s.name && names.includes(s.name) && LIVE.includes(s.state ?? s.status ?? ""));
}

/**
 * The stopped session of a worker that was lost: the ticket has not landed and is held by the Claim mark alone, with no
 * open pull request, no live session, and a session named after it listed but no longer live. A person's assignment
 * is a live hold, so an assigned ticket never has one, and a landed ticket's worker finished, so it has none either.
 */
export function lostWorker(t: Ticket, sessions: Session[]): Session | undefined {
  if (t.landed || t.state !== "claimed" || !t.claimed || t.assignees.length || liveWorker(t, sessions)) return undefined;
  return sessions.find((s) => s.name && [t.worker, `t-${t.number}`].includes(s.name));
}

const done = (t: Ticket) => t.landed;

/**
 * Whether a worker holds or works on the ticket until it merges: claimed or assigned, its pull request open, or a
 * live session named after it. The parallel safety check holds a ready ticket against these on every call.
 */
export const inFlight = (t: Ticket, sessions: Session[]) =>
  !done(t) && (t.claimed || t.assignees.length > 0 || t.pr?.state === "OPEN" || !!liveWorker(t, sessions));

export function planNext(input: NextInput): Action[] {
  const { state, panel, sessions, checks, failedHeads, mainPr } = input;
  const ref = refIn(state.epic.repo);
  // A ticket as spp dispatch and the other commands take it: its number in the Epic's repo, else its URL.
  const id = (t: Ticket) => (t.repo === state.epic.repo ? String(t.number) : t.url);

  if (state.tickets.every(done)) {
    if (mainPr?.state === "MERGED") return [{ kind: "close", pr: mainPr.url, reason: `${ref(mainPr.url)} merged into the base branch` }];
    // The panel is decided only once the pull request exists, since its changed lines are one of the thresholds.
    if (mainPr?.state !== "OPEN") {
      return [{ kind: "main-gate", reason: "every ticket merged; open the pull request to the base branch, then run spp next again for the panel decision" }];
    }
    const why = [
      state.tickets.length >= panel.tickets && `${state.tickets.length} tickets (${panel.tickets} or more)`,
      panel.sizeL && state.tickets.some((t) => t.size === "L") && "a size L ticket",
      mainPr.lines >= panel.lines && `${mainPr.lines} changed lines (${panel.lines} or more)`,
    ].filter(Boolean);
    const verdict = why.length ? `panel: ${why.join(", ")}` : `no panel: ${state.tickets.length} tickets, no size L, ${mainPr.lines} changed lines`;
    return [{ kind: "main-gate", pr: mainPr.url, panel: why.length > 0, reason: `every ticket merged; review ${ref(mainPr.url)}; ${verdict}` }];
  }

  const byUrl = new Map(state.tickets.map((t) => [t.url, t]));
  const order = [...state.layers.flat(), ...state.cycle].map((u) => byUrl.get(u)!);
  const actions: Action[] = [];
  const waitingOn: string[] = [];
  const idle: string[] = [];

  const ready = new Map(state.tickets.map((t) => [t.repo === state.epic.repo ? String(t.number) : `${t.repo}#${t.number}`, t]));
  const wave = input.wave.wave.map((w) => ready.get(w)!);
  if (wave.length) actions.push({ kind: "dispatch", tickets: wave.map(id), driver: input.driver, reason: `${wave.length} ready ticket(s) can run together` });
  for (const h of input.wave.held) idle.push(`${ref(ready.get(h.ticket)!.url)} held: ${h.reason}`);

  for (const t of order) {
    if (done(t)) continue;
    const pr = t.pr?.url ?? "";
    const one = { tickets: [id(t)], pr };
    const s = liveWorker(t, sessions);
    const running = s ? ` (${s.name} ${s.state ?? s.status})` : "";
    const c = checks[pr] ?? { result: "pending", failing: [] };
    if (t.state === "ready") {
      if (s) waitingOn.push(`${ref(t.url)} dispatched${running}`);
    } else if (lostWorker(t, sessions)) {
      // A stopped worker with no pull request is no work in flight: waiting on it would wake at once, forever.
      const lost = lostWorker(t, sessions)!;
      const reason = `${ref(t.url)} is claimed with no pull request and its worker ${lost.name} ${lost.state ?? lost.status}: worker lost; ask the user before handing it back`;
      actions.push({ kind: "hand-back", tickets: [id(t)], reason });
    } else if (t.state === "claimed") {
      waitingOn.push(`${ref(t.url)} claimed${running || (t.worker ? ` by ${t.worker}` : "")}`);
    } else if (s && (t.state === "pr-open" || t.state === "gate-fail")) {
      waitingOn.push(`${ref(t.url)} ${t.state}, its worker is still running${running}`);
    } else if (t.state === "gate-fail" || (t.state === "pr-open" && c.result === "fail")) {
      // Failing CI is a Critical finding: it shares the one fix round with a failed gate, so the second failed head hands back.
      const what = t.state === "gate-fail" ? "failed its gate" : `checks fail: ${c.failing.join(", ")}`;
      if ((failedHeads[pr] ?? 1) < 2) actions.push({ kind: "fix", ...one, reason: `${ref(pr)} ${what}; one fix round by the same worker` });
      else actions.push({ kind: "hand-back", ...one, reason: `${ref(pr)} ${what}, after its one fix round` });
    } else if (t.state === "pr-open") {
      // shortcut: none (no CI configured) gates like pass, as spp merge does; a repo whose CI registers late could gate early.
      if (c.result === "pass" || c.result === "none") actions.push({ kind: "gate", ...one, reason: `${ref(pr)} checks ${c.result}, no verdict on its head` });
      else waitingOn.push(`${ref(t.url)} ${ref(pr)} checks ${c.result}`);
    } else if (t.state === "gate-pass") {
      const waiting = t.blockedBy.filter((b) => !(byUrl.get(b) && done(byUrl.get(b)!)));
      if (!waiting.length) actions.push({ kind: "merge", ...one, reason: `${ref(pr)} passed its gate and its blockers merged` });
      else idle.push(`${ref(t.url)} passed its gate and waits on ${waiting.map(ref).join(", ")}`);
    } else if (t.state === "not-agent") idle.push(`${ref(t.url)} has no ready-for-agent label`);
    else if (t.state === "handed-back") idle.push(`${ref(t.url)} is handed back`);
    else if (t.state === "blocked" && t.layer !== null) idle.push(`${ref(t.url)} is blocked by ${t.blockedBy.map(ref).join(", ")}`);
  }

  if (actions.length) return actions;
  if (waitingOn.length) return [{ kind: "wait", reason: `in flight: ${waitingOn.join("; ")}${idle.length ? `; also ${idle.join("; ")}` : ""}` }];
  const cycle = state.cycle.length ? [`cycle: ${state.cycle.map(ref).join(", ")}`] : [];
  return [{ kind: "stuck", reason: `nothing ready and nothing in flight: ${[...cycle, ...idle].join("; ")}` }];
}
