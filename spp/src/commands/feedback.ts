/**
 * `spp feedback` works on Skill feedback: it checks a draft before anyone files it, and lists the Signals waiting to
 * become one.
 *
 * `spp feedback checkpoint` offers the pending candidates between steps of an Attended session, printing them with the
 * steps an agent follows to file, skip or keep each one, and prints nothing on a worker's `sdd/` branch.
 *
 * It also acts on a pending candidate. `spp feedback file <fingerprint>` files it on the one grouped Skill feedback
 * issue for that skill step and category on syn54x/skills-plus-plus, and rewrites the person's own tally comment
 * there; under the person's Submission mode Review for this repo it first prints what it would post and files only when run again
 * with that text's `--confirm` hash. `spp feedback skip <fingerprint>` drops a candidate for good, and
 * `spp feedback submission [Auto|Review]` reads or sets the person's Submission mode for this repo.
 *
 * The check and the list:
 *
 * - `spp feedback check <body-file> [--title-file <file>]` is the outbound check on a skill-feedback draft, run before
 *   anyone files it. The Routing block's Self-improvement mode sets what the draft may say. A blocked draft prints one
 *   `rule <rule> <name>, line <n>: <text>` line per hit on stdout. It never rewrites the draft. The title file holds
 *   one title per line, and a line that is only `owner/repo` names a repo. It has no `--json`.
 * - `spp feedback pending [--json]` lists the current repo's Signal log grouped by fingerprint (one skill step and
 *   category), most Signals first: one `<fingerprint> <count> <skill> <step> <category>` line each, or with `--json`
 *   a {@link FeedbackCandidate} list. An absent log lists nothing.
 *
 * @module
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { workerTicket } from "../attended.ts";
import { checkFeedback, type FeedbackContext, formatHit } from "../feedback.ts";
import { CHANGES, FEEDBACK_REPO, issueBody, issueTitle, previewHash, repoKey, TALLY_MARKER, tallyComment } from "../feedback-file.ts";
import { GhError, runGh } from "../gh.ts";
import { find, flagPairs, parseIssue, put, readTrailer, UsageError } from "../markers.ts";
import { currentRepo } from "../notes.ts";
import { readSelfImprovementMode, type SelfImprovementMode, selfImprovementModeOf } from "../routing.ts";
import { TRUSTED_ASSOCIATIONS, trustedAuthor } from "../snapshot.ts";
import { candidate, collecting, type FeedbackCandidate, pendingCandidates, readDecisions, recordDecision, runCounts } from "../signals.ts";
import { readSubmissionMode, type SubmissionMode, tallySecret, writeSubmissionMode } from "../submission.ts";

export type { FeedbackCandidate } from "../signals.ts";

/** The usage text `spp feedback --help` prints. */
export const USAGE = `usage: spp feedback check <body-file> [--title-file <file>]
       spp feedback pending [--json]
       spp feedback file <fingerprint> [--epic <epic number | issue URL>] [--change <change>] [--note <text>] [--confirm <hash>]
       spp feedback skip <fingerprint>
       spp feedback submission [Auto|Review]
       spp feedback checkpoint
<change> is one of: ${CHANGES.join(", ")}
`;
const OWNER_REPO = /^[\w.-]+\/[\w.-]+$/;
const OFF = "Self-improvement mode is Off (or unset): nothing may be filed";
// The modes from least to most a report may say; a run takes the lowest of every repo it touches.
const MODE_ORDER: SelfImprovementMode[] = ["Off", "Anonymous", "Full Detail"];
const SUBMISSION_MODES: SubmissionMode[] = ["Auto", "Review"];

/** The steps `spp feedback checkpoint` prints after the pending candidates, for the agent at the checkpoint. */
export const CHECKPOINT_STEPS = `This is a checkpoint. For each candidate, run \`spp feedback file <fingerprint>\`, adding \`--epic <epic>\` when the work belongs to an Epic, and \`--change <change>\` and \`--note <text>\` when the evidence supports them. Its exit says what to do next:
- 0: filed. Tell the person its last line.
- 3: a preview. Show it whole and ask: file, skip or later. File: run the same command again with \`--confirm <hash>\`. Skip: run \`spp feedback skip <fingerprint>\`. Later: do nothing; it is offered at the next checkpoint.
- 2: the outbound check blocked it. Redraft \`--note\` without the flagged text and run it once more; if it blocks again, leave it for later.
- 1: tell the person the reason it printed and go on.
Draft \`--note\` and \`--change\` from evidence only: a count, or the moment a step was followed and was wrong. The charge may move to an earlier step than the one named only with that evidence; the note names that step and the evidence.
Run this between steps, never in the middle of one, and never from a worker.
`;

// One candidate as `spp feedback pending` prints it, and the checkpoint after it.
const pendingLine = (c: FeedbackCandidate) => `${c.fingerprint} ${c.count} ${c.skill} ${c.step} ${c.category}\n`;

const fail = (sub: string, message: string) => (process.stderr.write(`spp feedback ${sub}: ${message}\n`), 1);
const usage = (sub: string, e: UsageError) => (process.stderr.write((e.message ? `spp feedback ${sub}: ${e.message}\n` : "") + USAGE), 1);

/**
 * The outbound check's context as `check` and `file` both gather it: the person's own repo, the repo names the report
 * must not leak, the titles, and the paths `git ls-files` lists, read once per run.
 */
function outboundContext(ctx: Omit<FeedbackContext, "paths">): FeedbackContext {
  const paths = execFileSync("git", ["ls-files", "--full-name", "-z", "--", ":/"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
  return { ...ctx, paths };
}

/**
 * Checks a skill-feedback draft, lists, files or skips the pending candidates, offers them at a checkpoint, or reads
 * or sets the Submission mode.
 *
 * @param args - `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not
 *   leak; `pending`, then `--json` for the {@link FeedbackCandidate} list; `file <fingerprint>` with `--epic <epic>`
 *   (whose repos' modes also bind), `--change <change>` (the Proposed change, default `unclear`), `--note <text>` and
 *   `--confirm <hash>`; `skip <fingerprint>`; `submission`, then `Auto` or `Review` in any case to set it for this repo; or
 *   `checkpoint`, alone.
 * @returns For `check`, one `rule <rule> <name>, line <n>: <text>` line per hit on stdout, in line order, with any
 *   secret in the text replaced by `[REDACTED]`. A hit that only warns (rules 1 to 6 under Full Detail) starts with
 *   `warning: `. Exit 0 when the draft is clean or has warnings only; 2 when any hit blocks (a secret in any mode, or
 *   rules 1 to 6 under Anonymous); 1 when the mode is Off or unset. For `pending`: 0, an absent log included, leaving
 *   out skipped fingerprints and filed ones with no later Signal.
 *
 *   For `file`, stdout starts with one such line per hit on the issue body (when one would be created) and the tally
 *   comment, checked under the lowest Self-improvement mode of the checkout and the Epic's repos. Exit 0 when filed,
 *   last line `filed <fingerprint> <issue URL> created|existing`. Exit 3 under Review with nothing written: `title:
 *   <title>` and the issue body (or `issue: <issue URL> (by <author>)` when the group exists), a blank line, the tally
 *   comment, then `confirm: <hash>`; the same command with `--confirm <hash>` files that text, and a stale hash shows
 *   the new text. Submission mode Auto files at once, falling back to Review, with a line on stderr, when any of those
 *   repos is private. Exit 2 when the check blocks, nothing written. Exit 1 under `CI`, outside an Attended session,
 *   in a worker's checkout, under an Off mode, on an unknown fingerprint or a failing `gh` call, with the reason on
 *   stderr and no decision recorded.
 *
 *   The grouped issue is only ever one opened by the gh user or by an OWNER, MEMBER or COLLABORATOR of
 *   syn54x/skills-plus-plus (ADR 0009); a stranger's issue carrying the fingerprint is passed over. The person keeps
 *   one tally comment on it for each repo they file from, matched by a keyed hash of the repo (under a secret in the
 *   spp config file) in its trailer.
 *
 *   For `skip`, `skipped <fingerprint>` and exit 0; 1 on an unknown fingerprint. It posts nothing, so it runs
 *   anywhere. For `submission`, `Submission mode: <mode>` and exit 0.
 *
 *   For `checkpoint` with no other argument, exit 0 whatever happens. It prints nothing under `CI`, outside an Attended session, under Self-improvement
 *   mode Off, on a worker's `sdd/` branch or with nothing pending. Otherwise it prints `spp: <n> Skill feedback
 *   candidates pending for <owner/repo>:`, the candidates exactly as `pending` prints them, a blank line, then
 *   {@link CHECKPOINT_STEPS}. An error (a checkout with no origin remote) writes one `spp feedback checkpoint:
 *   <message>` line to stderr and still exits 0, so the `SessionStart` hook that runs it never fails.
 *
 *   Every form exits 1 on a usage error, with the usage on stderr.
 * @example
 * ```bash
 * spp feedback check draft.md --title-file titles.txt
 * spp feedback pending --json
 * spp feedback file 3f2a9c1b7e4d --change "add a check"
 * spp feedback file 3f2a9c1b7e4d --change "add a check" --confirm 9b1c0d2e3f4a
 * spp feedback skip 3f2a9c1b7e4d
 * spp feedback submission auto
 * spp feedback checkpoint
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const [sub, body, ...flags] = args;
  if (sub === "pending" && (args.length === 1 || (args.length === 2 && body === "--json"))) {
    const candidates = pendingCandidates(currentRepo());
    if (body === "--json") process.stdout.write(JSON.stringify(candidates, null, 2) + "\n");
    else for (const c of candidates) process.stdout.write(pendingLine(c));
    return 0;
  }
  if (sub === "checkpoint" && args.length === 1) return checkpoint();
  if (sub === "file") return file(args.slice(1));
  if (sub === "skip" && args.length === 2) return skip(body);
  if (sub === "submission" && args.length <= 2) return submission(body);
  const titleFile = flags[0] === "--title-file" && flags.length === 2 ? flags[1] : undefined;
  if (sub !== "check" || !body || (flags.length > 0 && titleFile === undefined)) {
    process.stderr.write(USAGE);
    return 1;
  }

  const profile = readSelfImprovementMode(process.cwd());
  if (profile === "Off") return fail("check", OFF);

  const ownRepo = (await runGh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])).trim();
  const lines = titleFile ? readFileSync(titleFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
  const hits = checkFeedback(
    readFileSync(body, "utf8"),
    outboundContext({ profile, ownRepo, names: lines.filter((l) => OWNER_REPO.test(l)), titles: lines.filter((l) => !OWNER_REPO.test(l)) }),
  );
  for (const h of hits) process.stdout.write(formatHit(h) + "\n");
  return hits.some((h) => h.level === "block") ? 2 : 0;
}

// Never fails: a session start runs it, so an error is one stderr line and exit 0.
function checkpoint(): number {
  try {
    if (!collecting()) return 0;
    if (workerTicket(process.cwd()) !== null) return 0; // a worker never offers or files
    const repo = currentRepo();
    const candidates = pendingCandidates(repo);
    if (!candidates.length) return 0;
    process.stdout.write(`spp: ${candidates.length} Skill feedback candidates pending for ${repo}:\n${candidates.map(pendingLine).join("")}\n${CHECKPOINT_STEPS}`);
  } catch (e) {
    process.stderr.write(`spp feedback checkpoint: ${e instanceof Error ? e.message : String(e)}\n`);
  }
  return 0;
}

function submission(value: string | undefined): number {
  let repo: string;
  try {
    repo = currentRepo();
  } catch (e) {
    return fail("submission", e instanceof Error ? e.message : String(e));
  }
  if (value !== undefined) {
    const mode = SUBMISSION_MODES.find((m) => m.toLowerCase() === value.toLowerCase());
    if (!mode) return usage("submission", new UsageError(`Submission mode must be Auto or Review, got ${JSON.stringify(value)}`));
    writeSubmissionMode(repo, mode);
  }
  process.stdout.write(`Submission mode: ${readSubmissionMode(repo)}\n`);
  return 0;
}

// Filing needs what recording needs (CI unset, an Attended session, a mode other than Off) and never runs in a
// worker: the reason it may not, or null when it may. Skipping posts nothing, so it is not gated.
function notFiling(): string | null {
  if (process.env.CI) return "not filed: CI";
  if (workerTicket(process.cwd()) !== null) return "not filed: a worker never files";
  if (!collecting()) return readSelfImprovementMode(process.cwd()) === "Off" ? OFF : "not filed: not an Attended session";
  return null;
}

function skip(fp: string): number {
  const repo = currentRepo();
  if (!candidate(repo, fp)) return fail("skip", `no Signals with fingerprint ${fp}`);
  recordDecision(repo, { fingerprint: fp, decision: "skipped" });
  process.stdout.write(`skipped ${fp}\n`);
  return 0;
}

// The repos on the Epic's trusted plan comment.
async function epicRepos(arg: string): Promise<string[]> {
  const epic = parseIssue(arg);
  const plan = await find(epic, "<!-- sdd-plan -->");
  const data = plan ? readTrailer(plan.body) : null;
  // Without the plan, the Epic's repos and their stricter modes are unknown, so nothing is filed.
  if (!data) throw new Error(`no trusted plan comment with a readable trailer on ${epic.label}`);
  return Array.isArray(data.repos) ? data.repos.filter((r): r is string => typeof r === "string") : [];
}

const isPrivate = async (repo: string) => (JSON.parse(await runGh(["repo", "view", repo, "--json", "isPrivate"])) as { isPrivate?: boolean }).isPrivate === true;
const issueUrl = (n: number) => `https://github.com/${FEEDBACK_REPO}/issues/${n}`;

let viewer: Promise<string> | undefined;
// The gh user's login, asked at most once per run.
const viewerLogin = () => (viewer ??= runGh(["api", "user", "--jq", ".login"]).then((s) => s.trim()));
// Whether spp may act on what this author wrote (ADR 0009), as `find` decides it: the gh user is asked only when the
// association does not settle it.
const trusted = async (login: string | null, association: string) =>
  trustedAuthor(login, association, TRUSTED_ASSOCIATIONS.includes(association) ? null : await viewerLogin());

type Group = { number: number; url: string; author: string };

// The open grouped issue for the fingerprint, opened by an author spp trusts (ADR 0009): the one this repo last created
// or filed it on, else the lowest-numbered open issue whose body's trailer names it. A stranger's issue carrying the
// fingerprint is passed over, so it never collects anyone's tally.
async function findGroup(repo: string, fp: string): Promise<Group | null> {
  const last = readDecisions(repo)
    .filter((d) => d.fingerprint === fp && (d.decision === "filed" || d.decision === "created") && typeof d.issue === "number")
    .at(-1);
  if (last) {
    let seen: [string, string | null, string] | null = null;
    try {
      seen = JSON.parse(await runGh(["api", `repos/${FEEDBACK_REPO}/issues/${last.issue}`, "--jq", "[.state, .user.login, .author_association] | @json"]));
    } catch (e) {
      if (!(e instanceof GhError)) throw e; // deleted or transferred: the search below decides
    }
    if (seen?.[0] === "open" && (await trusted(seen[1], seen[2]))) return { number: last.issue!, url: issueUrl(last.issue!), author: seen[1] ?? "" };
  }
  const q = `${fp} in:body repo:${FEEDBACK_REPO} is:issue is:open`;
  // Every page: strangers' issues carrying the fingerprint must not push the trusted group off the first one.
  const out = await runGh(["api", "--paginate", "-X", "GET", "search/issues", "-f", `q=${q}`, "--jq", ".items[] | [.number, .html_url, .body, .user.login, .author_association] | @json"]);
  const found = out.split("\n").filter(Boolean).map((l) => JSON.parse(l) as [number, string, string | null, string | null, string]);
  for (const [number, url, body, login, association] of found.sort((a, b) => a[0] - b[0])) {
    if (readTrailer(body ?? "")?.fingerprint === fp && (await trusted(login, association))) return { number, url, author: login ?? "" };
  }
  return null;
}

// The gh user's own tally comment on the issue for the repo with this key; another person's, or another repo's, is
// never touched.
async function ownTally(n: number, key: string): Promise<number | null> {
  const me = await viewerLogin();
  const out = await runGh(["api", `repos/${FEEDBACK_REPO}/issues/${n}/comments`, "--paginate", "--jq", ".[] | [.id, .body, .user.login] | @json"]);
  for (const line of out.split("\n").filter(Boolean)) {
    const [id, body, login] = JSON.parse(line) as [number, string, string];
    if (body.startsWith(TALLY_MARKER) && login === me && readTrailer(body)?.repoKey === key) return id;
  }
  return null;
}

async function createIssue(title: string, body: string): Promise<{ number: number; url: string }> {
  const dir = mkdtempSync(join(tmpdir(), "spp-feedback-"));
  try {
    writeFileSync(join(dir, "body.md"), body);
    const url = (await runGh(["issue", "create", "-R", FEEDBACK_REPO, "--title", title, "--label", "skill-feedback", "--body-file", join(dir, "body.md")])).trim();
    const n = /\/issues\/(\d+)$/.exec(url);
    if (!n) throw new GhError(`gh issue create printed no issue URL: ${url}`, 1, url);
    return { number: Number(n[1]), url };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function file(args: string[]): Promise<number> {
  const [fp, ...rest] = args;
  let opts: Record<string, string>;
  try {
    if (!fp || fp.startsWith("--")) throw new UsageError("file takes <fingerprint>");
    opts = Object.fromEntries(flagPairs(rest, ["--epic", "--change", "--note", "--confirm"]));
    if (opts["--change"] !== undefined && !CHANGES.includes(opts["--change"])) throw new UsageError(`--change must be one of: ${CHANGES.join(", ")}`);
  } catch (e) {
    if (e instanceof UsageError) return usage("file", e);
    throw e;
  }
  const refused = notFiling();
  if (refused) return fail("file", refused);
  const repo = currentRepo();
  const c = candidate(repo, fp);
  if (!c) return fail("file", `no Signals with fingerprint ${fp}`);

  try {
    let profile = readSelfImprovementMode(process.cwd());
    // The Epic reference is parsed here, past the gates, so a malformed one cannot change a CI or Off exit.
    const names = profile !== "Off" && opts["--epic"] !== undefined ? await epicRepos(opts["--epic"]) : [];
    for (const r of names) {
      const mode = await selfImprovementModeOf(r);
      if (MODE_ORDER.indexOf(mode) < MODE_ORDER.indexOf(profile)) profile = mode;
    }
    if (profile === "Off") return fail("file", OFF);

    let auto = readSubmissionMode(repo) === "Auto";
    for (const r of auto ? [...new Set([repo, ...names])] : []) {
      if (!(await isPrivate(r))) continue;
      process.stderr.write(`spp feedback file: Submission mode Auto falls back to Review: ${r} is private\n`);
      auto = false;
      break;
    }

    const group = await findGroup(repo, fp);
    const runs = runCounts(repo, c.skill, c.step);
    const title = issueTitle(c, runs);
    const body = group ? null : issueBody(c, runs, opts["--change"] ?? "unclear", auto);
    const key = repoKey(repo, tallySecret());
    const tally = tallyComment(c, runs, { repoKey: key, repo: profile === "Full Detail" ? repo : undefined, note: opts["--note"], auto });
    const ctx = outboundContext({ profile, ownRepo: repo, names, titles: [] });
    const hits = [...(body ? checkFeedback(body, ctx) : []), ...checkFeedback(tally, ctx)];
    for (const h of hits) process.stdout.write(formatHit(h) + "\n");
    if (hits.some((h) => h.level === "block")) return 2;

    if (!auto) {
      const preview = `${group ? `issue: ${group.url} (by ${group.author})\n` : `title: ${title}\n${body}`}\n${tally}`;
      const hash = previewHash(preview);
      if (opts["--confirm"] !== hash) {
        process.stdout.write(`${preview}confirm: ${hash}\n`);
        return 3;
      }
    }

    let target: { number: number; url: string } | null = group;
    if (!target) {
      target = await createIssue(title, body!);
      // The public issue exists from here on, so it is remembered before the tally, which may still fail.
      recordDecision(repo, { fingerprint: fp, decision: "created", issue: target.number });
    }
    await put(parseIssue(target.url), group ? await ownTally(target.number, key) : null, tally);
    recordDecision(repo, { fingerprint: fp, decision: "filed", issue: target.number });
    process.stdout.write(`filed ${fp} ${target.url} ${group ? "existing" : "created"}\n`);
    return 0;
  } catch (e) {
    if (e instanceof UsageError) return usage("file", e);
    if (e instanceof GhError) return fail("file", e.message);
    throw e;
  }
}
