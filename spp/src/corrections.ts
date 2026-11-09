// The corrections spp commands already see, recorded as Signals (ADR 0012): a failed verdict, a Hand-back, a
// deviation added to the plan, and the ready gate's `pin-match`. Each is charged to the maker of the corrected
// artifact, read from a trusted Marker comment's trailer, or to a fallback skill when no trailer names one. Nothing
// here changes a command's exit code, stdout or GitHub writes: each correction is a builder `recordSignal` calls only
// once its gate says yes, so with nothing collected it makes no gh call, and any failure while recording is one
// `spp <command>: signal not recorded: <reason>` line on stderr.
import { runGh } from "./gh.ts";
import { type Data, find, type Issue, issueRepo, parseIssue, PROGRESS_MARKER, readMaker, readTrailer } from "./markers.ts";
import { PIN_KEY } from "./pin.ts";
import { recordSignal, type SignalCategory } from "./signals.ts";
import { trustedAuthor } from "./snapshot.ts";

// One correction: the issue whose Marker comment names the maker, as the caller typed it (`ref`, resolved against
// `base` when it names only a number), the field of the maker (`"verifyPin"` for the pin's maker, none for the
// comment's last write), the skill charged when none is named, spp's own evidence text (given the resolved issue as
// `owner/repo#N`, so every spelling of one issue gives one evidence), and an optional check that must pass.
type Correction = {
  ref: string;
  base?: string;
  category: SignalCategory;
  field?: "verifyPin";
  fallback: string;
  evidence: (data: Data | null, name: string) => string;
  allow?: (issue: Issue) => Promise<boolean>;
};

const say = (command: string, reason: unknown) =>
  process.stderr.write(`spp ${command}: signal not recorded: ${reason instanceof Error ? reason.message : String(reason)}\n`);

// Whether a word names an issue: `#N`, `N`, `owner/repo#N` or an issue URL.
const ISSUE_REF = /^(#?\d+|[\w.-]+\/[\w.-]+#\d+|https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+\/?)$/;

// `ref` as an Issue, a bare number in the repo of `base` (an issue or pull request URL) when it has one; throws the
// UsageError of `parseIssue` when `ref` names no issue.
function resolve(ref: string, base?: string): Issue {
  const r = ref.replace(/\/$/, "");
  const n = /^#?(\d+)$/.exec(r)?.[1];
  const baseRepo = base && /^https:\/\/github\.com\/([^/]+\/[^/]+)\/(?:issues|pull)\/\d+\/?$/.exec(base)?.[1];
  if (n) return parseIssue(baseRepo ? `https://github.com/${baseRepo}/issues/${n}` : n);
  const m = /^([\w.-]+\/[\w.-]+)#(\d+)$/.exec(r);
  return parseIssue(m ? `https://github.com/${m[1]}/issues/${m[2]}` : r);
}

/**
 * Records `c` unless nothing is collected or its check fails; `recordSignal` drops it when the log already holds it.
 * The trailer is `trailer` when the caller holds the one that stood before its own write, or else the issue's
 * progress trailer. Everything that can fail, the reference included, is resolved in the builder, after the gate.
 */
async function record(command: string, c: Correction, trailer?: Data | null): Promise<void> {
  const r = await recordSignal(async () => {
    const issue = resolve(c.ref, c.base);
    if (c.allow && !(await c.allow(issue))) return null;
    const data = trailer !== undefined ? trailer : readTrailer((await find(issue, PROGRESS_MARKER))?.body ?? "");
    const maker = readMaker(data, c.field);
    const about = issueRepo(issue);
    const evidence = c.evidence(data, `${about}#${issue.number}`);
    return { about, category: c.category, skill: maker?.skill ?? c.fallback, step: maker?.step ?? "", evidence, ...(maker && { version: maker.version }) };
  });
  if ("failed" in r) say(command, r.failed);
}

/** A failed verdict on `pr`: a `fix-round` charged to the worker that last wrote the ticket's progress comment. */
export async function verdictCorrection(pr: string, v: { ticket: string; head: string; spec: string; quality: string }): Promise<void> {
  if (v.spec !== "fail" && v.quality !== "fail") return;
  await record("verdict", {
    ref: v.ticket,
    base: pr,
    category: "fix-round",
    fallback: "implement-issue",
    evidence: () => `${pr} head ${v.head}: spec ${v.spec}, quality ${v.quality}`,
  });
}

const HAND_BACKS: Record<string, { category: SignalCategory; field?: "verifyPin"; fallback: string }> = {
  "needs-info": { category: "brief-gap", field: "verifyPin", fallback: "harden" },
  blocked: { category: "missed-edge", field: "verifyPin", fallback: "harden" },
  "ready-for-human": { category: "human-needed", fallback: "implement-issue" },
};

/**
 * A Hand-back along `route`: `brief-gap` or `missed-edge` charged to the pin's maker, or `human-needed` charged to the
 * worker whose write the Hand-back replaced, both read from `before`, the progress trailer as it stood before the
 * Hand-back's own write. A reason starting `worker lost` names no wrong artifact.
 */
export async function handBackCorrection(arg: string, route: string, reason: string, before: Data): Promise<void> {
  if (reason.startsWith("worker lost")) return;
  await record("hand-back", { ref: arg, ...HAND_BACKS[route], evidence: (_, name) => `${name} ${route}: ${reason}` }, before);
}

/**
 * Deviations added to the Epic's plan: one `contract-edited` each, charged to the pin's maker on the issue the text
 * leads with, or with no leading issue to the maker of the plan comment as `plan` (its trailer before this write) held it.
 */
export async function deviationCorrections(epic: string, texts: string[], plan: Data): Promise<void> {
  for (const text of texts) {
    const lead = text.split(/\s/)[0].replace(/:$/, "");
    const evidence = () => `${epic} deviation: ${text}`;
    if (ISSUE_REF.test(lead)) await record("plan", { ref: lead, base: epic, category: "contract-edited", field: "verifyPin", fallback: "harden", evidence });
    else await record("plan", { ref: epic, category: "contract-edited", fallback: "to-tickets", evidence }, plan);
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
  await record("lint", {
    ref: arg,
    category: "contract-edited",
    field: "verifyPin",
    fallback: "harden",
    evidence: (data, name) => `${name} Verify block no longer matches pin ${String(data?.[PIN_KEY] ?? "").slice(0, 12)}`,
    allow: editorTrusted,
  });
}
