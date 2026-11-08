// The corrections spp commands already see, recorded as Signals (ADR 0012): a failed verdict, a Hand-back, a
// deviation added to the plan, and the ready gate's `pin-match`. Each is charged to the maker of the corrected
// artifact, read from a trusted Marker comment's trailer, or to a fallback skill when no trailer names one. Nothing
// here changes a command's exit code, stdout or GitHub writes: with nothing collected it makes no gh call, and any
// failure while recording is one `spp <command>: signal not recorded: <reason>` line on stderr.
import { runGh } from "./gh.ts";
import { type Data, find, type Issue, parseIssue, PROGRESS_MARKER, readMaker, readTrailer } from "./markers.ts";
import { currentRepo } from "./notes.ts";
import { PIN_KEY } from "./pin.ts";
import { collecting, fingerprint, pendingCandidates, recordSignal, type SignalCategory } from "./signals.ts";
import { trustedAuthor } from "./snapshot.ts";

// One correction: the issue whose Marker comment names the maker, the field of the maker (`"verifyPin"` for the pin's
// maker, none for the comment's last write), the skill charged when none is named, and spp's own evidence text.
type Correction = { issue: Issue; category: SignalCategory; field?: "verifyPin"; fallback: string; evidence: (data: Data | null) => string };

const say = (command: string, reason: unknown) =>
  process.stderr.write(`spp ${command}: signal not recorded: ${reason instanceof Error ? reason.message : String(reason)}\n`);

const repoOf = (issue: Issue) => (issue.repo === "{owner}/{repo}" ? currentRepo() : issue.repo);

/**
 * Records `c` unless nothing is collected or the log already holds the same fingerprint and evidence. The trailer is
 * `trailer` when the caller holds the one that stood before its own write, or else the issue's progress trailer.
 */
async function record(command: string, c: Correction, trailer?: Data | null): Promise<void> {
  let input: Parameters<typeof recordSignal>[0];
  try {
    if (!collecting()) return;
    const data = trailer !== undefined ? trailer : readTrailer((await find(c.issue, PROGRESS_MARKER))?.body ?? "");
    const maker = readMaker(data, c.field);
    const repo = repoOf(c.issue);
    const skill = maker?.skill ?? c.fallback;
    const step = maker?.step ?? "";
    const evidence = c.evidence(data);
    const fp = fingerprint(skill, step, c.category);
    if (pendingCandidates(repo).some((p) => p.fingerprint === fp && p.evidence.includes(evidence))) return;
    input = { repo, category: c.category, skill, step, evidence, ...(maker && { version: maker.version }) };
  } catch (e) {
    return void say(command, e);
  }
  const r = recordSignal(input);
  if ("failed" in r) say(command, r.failed);
}

// An issue as `parseIssue` takes it, in the repo of `base` when `ref` names only a number.
function issueIn(base: Issue, ref: string): Issue | null {
  const n = /^#?(\d+)$/.exec(ref)?.[1];
  if (n) return parseIssue(base.repoFlag.length ? `https://github.com/${base.repo}/issues/${n}` : n);
  const m = /^([\w.-]+\/[\w.-]+)#(\d+)$/.exec(ref);
  if (m) return parseIssue(`https://github.com/${m[1]}/issues/${m[2]}`);
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(ref) ? parseIssue(ref) : null;
}

/** A failed verdict on `pr`: a `fix-round` charged to the worker that last wrote the ticket's progress comment. */
export function verdictCorrection(pr: string, v: { ticket: string; head: string; spec: string; quality: string }): Promise<void> {
  if (v.spec !== "fail" && v.quality !== "fail") return Promise.resolve();
  const repo = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/\d+\/?$/.exec(pr)?.[1];
  const ticket = /^\d+$/.test(v.ticket) && repo ? `https://github.com/${repo}/issues/${v.ticket}` : v.ticket;
  return record("verdict", {
    issue: parseIssue(ticket),
    category: "fix-round",
    fallback: "implement-issue",
    evidence: () => `${pr} head ${v.head}: spec ${v.spec}, quality ${v.quality}`,
  });
}

/**
 * The progress trailer as it stands before a `ready-for-human` Hand-back rewrites it, since that Signal is charged to
 * the worker whose write the Hand-back replaces; undefined when no Signal will be recorded for it.
 */
export async function trailerBefore(command: string, arg: string, route: string, reason: string): Promise<Data | null | undefined> {
  if (route !== "ready-for-human" || reason.startsWith("worker lost")) return undefined;
  try {
    if (!collecting()) return undefined;
    return readTrailer((await find(parseIssue(arg), PROGRESS_MARKER))?.body ?? "");
  } catch (e) {
    say(command, e);
    return undefined;
  }
}

const HAND_BACKS: Record<string, { category: SignalCategory; field?: "verifyPin"; fallback: string }> = {
  "needs-info": { category: "brief-gap", field: "verifyPin", fallback: "harden" },
  blocked: { category: "missed-edge", field: "verifyPin", fallback: "harden" },
  "ready-for-human": { category: "human-needed", fallback: "implement-issue" },
};

/**
 * A Hand-back along `route`: `brief-gap` or `missed-edge` charged to the pin's maker, or `human-needed` charged to the
 * worker, from `before` (what `trailerBefore` returned). A reason starting `worker lost` names no wrong artifact.
 */
export async function handBackCorrection(arg: string, route: string, reason: string, before: Data | null | undefined): Promise<void> {
  if (reason.startsWith("worker lost") || (route === "ready-for-human" && before === undefined)) return;
  await record("hand-back", { issue: parseIssue(arg), ...HAND_BACKS[route], evidence: () => `${arg} ${route}: ${reason}` }, before);
}

/**
 * Deviations added to the Epic's plan: one `contract-edited` each, charged to the pin's maker on the issue the text
 * leads with, or with no leading issue to the maker of the plan comment as `plan` (its trailer before this write) held it.
 */
export async function deviationCorrections(epic: string, texts: string[], plan: Data): Promise<void> {
  for (const text of texts) {
    let base: Issue;
    let target: Issue | null;
    try {
      base = parseIssue(epic);
      target = issueIn(base, text.split(/\s/)[0].replace(/:$/, ""));
    } catch (e) {
      say("plan", e);
      continue;
    }
    const evidence = () => `${epic} deviation: ${text}`;
    if (target) await record("plan", { issue: target, category: "contract-edited", field: "verifyPin", fallback: "harden", evidence });
    else await record("plan", { issue: base, category: "contract-edited", fallback: "to-tickets", evidence }, plan);
  }
}

const LAST_EDITOR = `query LastEditor($owner: String!, $repo: String!, $number: Int!) {
  viewer { login }
  repository(owner: $owner, name: $repo) {
    issue(number: $number) { author { login } authorAssociation userContentEdits(last: 1) { nodes { editor { login } } } }
  }
}`;

type LastEditor = {
  data?: {
    viewer?: { login?: string };
    repository?: { issue?: { author?: { login?: string } | null; authorAssociation?: string; userContentEdits?: { nodes?: { editor?: { login?: string } | null }[] } } };
  };
};

// Whether the issue body's last edit was made by someone spp trusts (ADR 0009); false when no edit is recorded.
async function editorTrusted(issue: Issue): Promise<boolean> {
  const [owner, repo] = issue.repo.split("/");
  const vars = issue.repoFlag.length ? ["-f", `owner=${owner}`, "-f", `repo=${repo}`] : ["-F", "owner={owner}", "-F", "repo={repo}"];
  const r = JSON.parse(await runGh(["api", "graphql", "-f", `query=${LAST_EDITOR}`, ...vars, "-F", `number=${issue.number}`])) as LastEditor;
  const i = r.data?.repository?.issue;
  const editor = i?.userContentEdits?.nodes?.at(-1)?.editor?.login;
  if (!editor) return false;
  const author = i?.author?.login;
  return trustedAuthor(editor, editor === author ? i?.authorAssociation : "NONE", r.data?.viewer?.login);
}

/**
 * The ready gate's `pin-match` on `arg`: a `contract-edited` charged to the pin's maker, recorded only when the
 * body's last editor is trusted, since that editor caused it.
 */
export async function pinCorrection(arg: string): Promise<void> {
  let issue: Issue;
  try {
    if (!collecting()) return;
    issue = parseIssue(arg);
    if (!(await editorTrusted(issue))) return;
  } catch (e) {
    return void say("lint", e);
  }
  await record("lint", {
    issue,
    category: "contract-edited",
    field: "verifyPin",
    fallback: "harden",
    evidence: (data) => `${arg} Verify block no longer matches pin ${String(data?.[PIN_KEY] ?? "").slice(0, 12)}`,
  });
}
