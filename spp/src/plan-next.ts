// The next actions of a build, from the EpicState and what the command read around it (CI, verdict history, the pull
// request to the base branch, the wave). Pure: no network, filesystem or environment.
import { type EpicState, refIn, type Ticket } from "./derive.ts";
import type { Routing } from "./routing.ts";
import type { PrState } from "./snapshot.ts";

/** What the build does next: fix a precondition, cut the branch, start workers, gate, fix, hand back, merge, wait, gate the pull request to the base branch, close the Epic, or stop as stuck. */
export type ActionKind = "preflight" | "branch" | "dispatch" | "gate" | "fix" | "hand-back" | "merge" | "wait" | "main-gate" | "close" | "stuck";
/** One next action of the build. */
export type Action = {
  /** What to do. */
  kind: ActionKind;
  /** The tickets it is about, for `dispatch`, `gate`, `fix`, `hand-back` and `merge`; a Fix pull request's is its Sub-issue, when attributed. */
  tickets?: string[];
  /** The pull request URL it is about. */
  pr?: string;
  /** On `main-gate`: whether the Epic is large enough for the review panel. */
  panel?: boolean;
  /** Why, in a sentence. */
  reason: string;
};

// How many ready tickets one Wave starts at most, unless `spp wave plan --max` says otherwise.
export const DEFAULT_WAVE_MAX = 4;

// The reason `spp wave plan` holds a ready ticket that `--running` names: the build started its worker, which has not claimed yet.
export const RUNNING = "running, not claimed yet";

export type NextInput = {
  state: EpicState;
  panel: Routing["panel"];
  resume: boolean; // the first spp next of a run: report each lost worker
  wave: { wave: string[]; held: { ticket: string; reason: string }[] }; // over the ready tickets, a running one held with the reason RUNNING
  checks: Record<string, { result: string; failing: string[] }>; // by pull request URL: pass, fail, pending or none, and the failing runs
  failedHeads: Record<string, number>; // by pull request URL: the heads a verdict or CI failed on, from GitHub
  mainPr: { url: string; state: PrState; lines: number } | null; // the pull request from the integration branch
};

/**
 * Whether the ticket's worker was lost: it has not landed and is held by the Claim mark alone, with no open or merged
 * pull request. A person's assignment is a live hold, so an assigned ticket is never lost. Only `--resume` asks,
 * since the build that started the worker knows it is still running.
 */
export const lostWorker = (t: Ticket) => !t.landed && t.state === "claimed" && t.claimed && !t.assignees.length;

const done = (t: Ticket) => t.landed;

/**
 * Whether a worker holds or works on the ticket until it merges: claimed or assigned, or its pull request open. The
 * parallel safety check holds a ready ticket against these on every call.
 */
export const inFlight = (t: Ticket) => !done(t) && (t.claimed || t.assignees.length > 0 || t.pr?.state === "OPEN");

export function planNext(input: NextInput): Action[] {
  const { state, panel, resume, checks, failedHeads, mainPr } = input;
  const ref = refIn(state.epic.repo);
  // A ticket as spp dispatch and the other commands take it: its number in the Epic's repo, else its URL.
  const id = (t: Ticket) => (t.repo === state.epic.repo ? String(t.number) : t.url);

  const openFixes = state.fixes.filter((f) => f.state === "OPEN");
  if (state.tickets.every(done)) {
    if (mainPr?.state === "MERGED") return [{ kind: "close", pr: mainPr.url, reason: `${ref(mainPr.url)} merged into the base branch` }];
  }
  // An open fix holds main-gate: it is routed below like a slice.
  if (state.tickets.every(done) && !openFixes.length) {
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
  const unattributed: string[] = [];
  const idle: string[] = [];

  const ready = new Map(state.tickets.map((t) => [t.repo === state.epic.repo ? String(t.number) : `${t.repo}#${t.number}`, t]));
  const wave = input.wave.wave.map((w) => ready.get(w)!);
  if (wave.length) actions.push({ kind: "dispatch", tickets: wave.map(id), reason: `${wave.length} ready ticket(s) can run together` });
  // A running ticket is in flight, so it makes the build wait; any other held ticket only idles.
  for (const h of input.wave.held) {
    if (h.reason === RUNNING) waitingOn.push(`${ref(ready.get(h.ticket)!.url)} ${RUNNING}`);
    else idle.push(`${ref(ready.get(h.ticket)!.url)} held: ${h.reason}`);
  }

  // The routing a slice and a fix share for an open pull request that has no verdict or a failed one: gate, fix, hand back or wait.
  const route = (st: string, pr: string, one: Action, c: { result: string; failing: string[] }, handBack: string): Action | string => {
    if (st === "gate-fail" || c.result === "fail") {
      // Failing CI is a Critical finding: it shares the one fix round with a failed gate, so the second failed head hands back.
      const what = st === "gate-fail" ? "failed its gate" : `checks fail: ${c.failing.join(", ")}`;
      if ((failedHeads[pr] ?? 1) < 2) return { ...one, kind: "fix", reason: `${ref(pr)} ${what}; one fix round by the same worker` };
      return { ...one, kind: "hand-back", reason: `${ref(pr)} ${what}, after its one fix round${handBack}` };
    }
    // shortcut: none (no CI configured) gates like pass, as spp merge does; a repo whose CI registers late could gate early.
    if (c.result === "pass" || c.result === "none") return { ...one, kind: "gate", reason: `${ref(pr)} checks ${c.result}, no verdict on its head` };
    return `${ref(pr)} checks ${c.result}`;
  };

  for (const f of openFixes) {
    const t = f.ticket ? byUrl.get(f.ticket) : undefined;
    if (!t) {
      unattributed.push(`${ref(f.url)} is an unattributed fix: add Refs #<Sub-issue> to its body, or close it`);
      continue;
    }
    const pr = f.url;
    const one = { kind: "gate" as const, tickets: [id(t)], pr, reason: "" };
    const g = f.gate;
    const c = checks[pr] ?? { result: "pending", failing: [] };
    if (g === "gate-pass") actions.push({ ...one, kind: "merge", reason: `${ref(pr)} passed its gate` });
    else {
      const r = route(g, pr, one, c, "; the decision is a person's, and no Sub-issue is relabelled");
      if (typeof r === "string") waitingOn.push(`fix ${r}`);
      else actions.push(r);
    }
  }

  for (const t of order) {
    if (done(t)) continue;
    const pr = t.pr?.url ?? "";
    const one = { tickets: [id(t)], pr };
    const c = checks[pr] ?? { result: "pending", failing: [] };
    if (t.state === "ready") continue; // dispatched above, or held by the wave
    if (resume && lostWorker(t)) {
      // A resumed build lost its workers with its session: a claim with no pull request is work nobody is doing.
      const reason = `${ref(t.url)} is claimed with no pull request and no assignee${t.worker ? `, by ${t.worker}` : ""}: worker lost; ask the user before handing it back`;
      actions.push({ kind: "hand-back", tickets: [id(t)], reason });
    } else if (t.state === "claimed") {
      waitingOn.push(`${ref(t.url)} claimed${t.worker ? ` by ${t.worker}` : ""}`);
    } else if (t.state === "gate-fail" || t.state === "pr-open") {
      const r = route(t.state, pr, { kind: "gate", ...one, reason: "" }, c, "");
      if (typeof r === "string") waitingOn.push(`${ref(t.url)} ${r}`);
      else actions.push(r);
    } else if (t.state === "gate-pass") {
      const waiting = t.blockedBy.filter((b) => !(byUrl.get(b) && done(byUrl.get(b)!)));
      if (!waiting.length) actions.push({ kind: "merge", ...one, reason: `${ref(pr)} passed its gate and its blockers merged` });
      else idle.push(`${ref(t.url)} passed its gate and waits on ${waiting.map(ref).join(", ")}`);
    } else if (t.state === "not-agent") idle.push(`${ref(t.url)} has no ready-for-agent label`);
    else if (t.state === "handed-back") idle.push(`${ref(t.url)} is handed back`);
    else if (t.state === "blocked" && t.layer !== null) idle.push(`${ref(t.url)} is blocked by ${t.blockedBy.map(ref).join(", ")}`);
  }

  // The actions carry no wait, so an unattributed fix beside them is named on the first one.
  if (actions.length) return unattributed.length ? [{ ...actions[0], reason: `${actions[0].reason}; also ${unattributed.join("; ")}` }, ...actions.slice(1)] : actions;
  if (waitingOn.length) return [{ kind: "wait", reason: `in flight: ${waitingOn.join("; ")}${idle.length + unattributed.length ? `; also ${[...unattributed, ...idle].join("; ")}` : ""}` }];
  const cycle = state.cycle.length ? [`cycle: ${state.cycle.map(ref).join(", ")}`] : [];
  return [{ kind: "stuck", reason: `nothing ready and nothing in flight: ${[...cycle, ...unattributed, ...idle].join("; ")}` }];
}
