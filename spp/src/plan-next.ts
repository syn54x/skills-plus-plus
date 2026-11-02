// The next actions of a build, from the EpicState and what the command read around it (CI, verdict history, the pull
// request to the base branch, the session list, the wave). Pure: no network, filesystem or environment.
import type { EpicState, Ticket } from "./derive.ts";
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
  driver?: "desktop" | "bg" | "subagent";
  /** On `main-gate`: whether the Epic is large enough for the review panel. */
  panel?: boolean;
  /** Why, in a sentence. */
  reason: string;
};

// One entry of `claude agents --json --all`: background sessions carry `state`, interactive ones `status`.
export type Session = { name?: string; state?: string; status?: string };

export type NextInput = {
  state: EpicState;
  panel: Routing["panel"];
  driver: "bg" | "subagent"; // spp sees the messaging socket or not; desktop detection is the skill's
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
    const s = liveWorker(t, sessions);
    const running = s ? ` (${s.name} ${s.state ?? s.status})` : "";
    const c = checks[pr] ?? { result: "pending", failing: [] };
    if (t.state === "ready") {
      if (s) inFlight.push(`${ref(t.url)} dispatched${running}`);
    } else if (t.state === "claimed") {
      inFlight.push(`${ref(t.url)} claimed${running || (t.worker ? ` by ${t.worker}` : "")}`);
    } else if (s && (t.state === "pr-open" || t.state === "gate-fail")) {
      inFlight.push(`${ref(t.url)} ${t.state}, its worker is still running${running}`);
    } else if (t.state === "gate-fail" || (t.state === "pr-open" && c.result === "fail")) {
      // Failing CI is a Critical finding: it shares the one fix round with a failed gate, so the second failed head hands back.
      const what = t.state === "gate-fail" ? "failed its gate" : `checks fail: ${c.failing.join(", ")}`;
      if ((failedHeads[pr] ?? 1) < 2) actions.push({ kind: "fix", ...one, reason: `${ref(pr)} ${what}; one fix round by the same worker` });
      else actions.push({ kind: "hand-back", ...one, reason: `${ref(pr)} ${what}, after its one fix round` });
    } else if (t.state === "pr-open") {
      // shortcut: none (no CI configured) gates like pass, as spp merge does; a repo whose CI registers late could gate early.
      if (c.result === "pass" || c.result === "none") actions.push({ kind: "gate", ...one, reason: `${ref(pr)} checks ${c.result}, no verdict on its head` });
      else inFlight.push(`${ref(t.url)} ${ref(pr)} checks ${c.result}`);
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
