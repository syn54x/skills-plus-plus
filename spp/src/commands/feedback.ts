/**
 * `spp feedback` works on Skill feedback: it checks a draft before anyone files it, and lists the Signals waiting to
 * become one.
 *
 * It also acts on a pending candidate. `spp feedback file <fingerprint>` files it on the one grouped Skill feedback
 * issue for that skill step and category on syn54x/skills-plus-plus, and rewrites the person's own tally comment
 * there; under the person's Submission mode Review it first prints what it would post and files only when run again
 * with that text's `--confirm` hash. `spp feedback skip <fingerprint>` drops a candidate for good, and
 * `spp feedback submission [Auto|Review]` reads or sets the person's Submission mode.
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
import { checkFeedback, type FeedbackContext, formatHit, type Hit } from "../feedback.ts";
import { CHANGES, FEEDBACK_REPO, issueBody, issueTitle, previewHash, TALLY_MARKER, tallyComment } from "../feedback-file.ts";
import { GhError, runGh } from "../gh.ts";
import { find, flagPairs, parseIssue, readTrailer, UsageError } from "../markers.ts";
import { currentRepo } from "../notes.ts";
import { parseRouting, readSelfImprovementMode, type SelfImprovementMode } from "../routing.ts";
import { candidate, pendingCandidates, readDecisions, recordDecision, runCounts } from "../signals.ts";
import { readSubmissionMode, type SubmissionMode, writeSubmissionMode } from "../submission.ts";

export type { FeedbackCandidate } from "../signals.ts";

/** The usage text `spp feedback --help` prints. */
export const USAGE = `usage: spp feedback check <body-file> [--title-file <file>]
       spp feedback pending [--json]
       spp feedback file <fingerprint> [--epic <epic number | issue URL>] [--change <change>] [--note <text>] [--confirm <hash>]
       spp feedback skip <fingerprint>
       spp feedback submission [Auto|Review]
<change> is one of: ${CHANGES.join(", ")}
`;
const OWNER_REPO = /^[\w.-]+\/[\w.-]+$/;
const OFF = "Self-improvement mode is Off (or unset): nothing may be filed";
// The modes from least to most a report may say; a run takes the lowest of every repo it touches.
const MODE_ORDER: SelfImprovementMode[] = ["Off", "Anonymous", "Full Detail"];
const SUBMISSION_MODES: SubmissionMode[] = ["Auto", "Review"];

const fail = (sub: string, message: string) => (process.stderr.write(`spp feedback ${sub}: ${message}\n`), 1);
const usage = (sub: string, e: UsageError) => (process.stderr.write((e.message ? `spp feedback ${sub}: ${e.message}\n` : "") + USAGE), 1);

/**
 * The outbound check as `check` and `file` both gather it: the person's own repo, the repo names the report must not
 * leak, the titles, and the paths `git ls-files` lists.
 */
function outbound(body: string, ctx: Omit<FeedbackContext, "paths">): Hit[] {
  const paths = execFileSync("git", ["ls-files", "--full-name", "-z", "--", ":/"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
  return checkFeedback(body, { ...ctx, paths });
}

/**
 * Checks a skill-feedback draft, lists, files or skips the pending candidates, or reads or sets the Submission mode.
 *
 * @param args - `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not
 *   leak; `pending`, then `--json` for the {@link FeedbackCandidate} list; `file <fingerprint>` with `--epic <epic>`
 *   (whose repos' modes also bind), `--change <change>` (the Proposed change, default `unclear`), `--note <text>` and
 *   `--confirm <hash>`; `skip <fingerprint>`; or `submission`, then `Auto` or `Review` in any case to set it.
 * @returns For `check`, one `rule <rule> <name>, line <n>: <text>` line per hit on stdout, in line order, with any
 *   secret in the text replaced by `[REDACTED]`. A hit that only warns (rules 1 to 6 under Full Detail) starts with
 *   `warning: `. Exit 0 when the draft is clean or has warnings only; 2 when any hit blocks (a secret in any mode, or
 *   rules 1 to 6 under Anonymous); 1 when the mode is Off or unset. For `pending`: 0, an absent log included, leaving
 *   out skipped fingerprints and filed ones with no later Signal.
 *
 *   For `file`, stdout starts with one such line per hit on the issue body (when one would be created) and the tally
 *   comment, checked under the lowest Self-improvement mode of the checkout and the Epic's repos. Exit 0 when filed,
 *   last line `filed <fingerprint> <issue URL> created|existing`. Exit 3 under Review with nothing written: `title:
 *   <title>` and the issue body (or `issue: <issue URL>` when the group exists), a blank line, the tally comment, then
 *   `confirm: <hash>`; the same command with `--confirm <hash>` files that text, and a stale hash shows the new text.
 *   Submission mode Auto files at once, falling back to Review, with a line on stderr, when any of those repos is
 *   private. Exit 2 when the check blocks, nothing written. Exit 1 under `CI`, an Off mode, an unknown fingerprint
 *   or a failing `gh` call, with the reason on stderr and no decision recorded.
 *
 *   For `skip`, `skipped <fingerprint>` and exit 0; 1 on an unknown fingerprint. For `submission`, `Submission mode:
 *   <mode>` and exit 0. Every form exits 1 on a usage error, with the usage on stderr.
 * @example
 * ```bash
 * spp feedback check draft.md --title-file titles.txt
 * spp feedback pending --json
 * spp feedback file 3f2a9c1b7e4d --change "add a check"
 * spp feedback file 3f2a9c1b7e4d --change "add a check" --confirm 9b1c0d2e3f4a
 * spp feedback skip 3f2a9c1b7e4d
 * spp feedback submission auto
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const [sub, body, ...flags] = args;
  if (sub === "pending" && (args.length === 1 || (args.length === 2 && body === "--json"))) {
    const candidates = pendingCandidates(currentRepo());
    if (body === "--json") process.stdout.write(JSON.stringify(candidates, null, 2) + "\n");
    else for (const c of candidates) process.stdout.write(`${c.fingerprint} ${c.count} ${c.skill} ${c.step} ${c.category}\n`);
    return 0;
  }
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
  const hits = outbound(readFileSync(body, "utf8"), {
    profile,
    ownRepo,
    names: lines.filter((l) => OWNER_REPO.test(l)),
    titles: lines.filter((l) => !OWNER_REPO.test(l)),
  });
  for (const h of hits) process.stdout.write(formatHit(h) + "\n");
  return hits.some((h) => h.level === "block") ? 2 : 0;
}

function submission(value: string | undefined): number {
  if (value !== undefined) {
    const mode = SUBMISSION_MODES.find((m) => m.toLowerCase() === value.toLowerCase());
    if (!mode) return usage("submission", new UsageError(`Submission mode must be Auto or Review, got ${JSON.stringify(value)}`));
    writeSubmissionMode(mode);
  }
  process.stdout.write(`Submission mode: ${readSubmissionMode()}\n`);
  return 0;
}

function skip(fp: string): number {
  const repo = currentRepo();
  if (!candidate(repo, fp)) return fail("skip", `no Signals with fingerprint ${fp}`);
  recordDecision(repo, { fingerprint: fp, decision: "skipped" });
  process.stdout.write(`skipped ${fp}\n`);
  return 0;
}

// The Self-improvement mode on a repo's default branch: its CLAUDE.md, else AGENTS.md, that carries a Routing block.
// Neither file, or no block, is Off.
async function remoteMode(repo: string): Promise<SelfImprovementMode> {
  for (const f of ["CLAUDE.md", "AGENTS.md"]) {
    let text: string;
    try {
      text = await runGh(["api", `repos/${repo}/contents/${f}`, "-H", "Accept: application/vnd.github.raw"]);
    } catch (e) {
      if (e instanceof GhError) continue;
      throw e;
    }
    if (text.includes("<!-- sdd-routing -->")) return parseRouting(text).selfImprovement;
  }
  return "Off";
}

// The repos on the Epic's trusted plan comment.
async function epicRepos(arg: string): Promise<string[]> {
  const epic = parseIssue(arg);
  const plan = await find(epic, "<!-- sdd-plan -->");
  const data = plan ? readTrailer(plan.body) : null;
  if (!data) throw new GhError(`no trusted plan comment with a readable trailer on ${epic.label}`, 1, "");
  return Array.isArray(data.repos) ? data.repos.filter((r): r is string => typeof r === "string") : [];
}

const isPrivate = async (repo: string) => (JSON.parse(await runGh(["repo", "view", repo, "--json", "isPrivate"])) as { isPrivate?: boolean }).isPrivate === true;
const issueUrl = (n: number) => `https://github.com/${FEEDBACK_REPO}/issues/${n}`;

// The open grouped issue for the fingerprint: the one this repo last filed it on, else the lowest-numbered open issue
// whose body's trailer names it. Any author's issue counts, since spp only adds the person's own tally to it.
async function findGroup(repo: string, fp: string): Promise<{ number: number; url: string } | null> {
  const last = readDecisions(repo).filter((d) => d.fingerprint === fp && d.decision === "filed" && typeof d.issue === "number").at(-1);
  if (last) {
    const { state } = JSON.parse(await runGh(["issue", "view", String(last.issue), "-R", FEEDBACK_REPO, "--json", "state"])) as { state: string };
    if (state === "OPEN") return { number: last.issue!, url: issueUrl(last.issue!) };
  }
  const found = JSON.parse(await runGh(["issue", "list", "-R", FEEDBACK_REPO, "--state", "open", "--search", `${fp} in:body`, "--json", "number,url,body"])) as { number: number; url: string; body: string }[];
  return found.filter((i) => readTrailer(i.body)?.fingerprint === fp).sort((a, b) => a.number - b.number)[0] ?? null;
}

// The gh user's own tally comment on the issue; another person's is never touched.
async function ownTally(n: number): Promise<number | null> {
  const me = (await runGh(["api", "user", "--jq", ".login"])).trim();
  const out = await runGh(["api", `repos/${FEEDBACK_REPO}/issues/${n}/comments`, "--paginate", "--jq", ".[] | [.id, .body, .user.login] | @json"]);
  for (const line of out.split("\n").filter(Boolean)) {
    const [id, body, login] = JSON.parse(line) as [number, string, string];
    if (body.startsWith(TALLY_MARKER) && login === me) return id;
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
  if (process.env.CI) return fail("file", "not filed: CI");
  const repo = currentRepo();
  const c = candidate(repo, fp);
  if (!c) return fail("file", `no Signals with fingerprint ${fp}`);

  try {
    let profile = readSelfImprovementMode(process.cwd());
    // The Epic reference is parsed here, past the gates, so a malformed one cannot change a CI or Off exit.
    const names = profile !== "Off" && opts["--epic"] !== undefined ? await epicRepos(opts["--epic"]) : [];
    for (const r of names) {
      const mode = await remoteMode(r);
      if (MODE_ORDER.indexOf(mode) < MODE_ORDER.indexOf(profile)) profile = mode;
    }
    if (profile === "Off") return fail("file", OFF);

    let auto = readSubmissionMode() === "Auto";
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
    const tally = tallyComment(c, runs, { repo: profile === "Full Detail" ? repo : undefined, note: opts["--note"], auto });
    const ctx = { profile, ownRepo: repo, names, titles: [] };
    const hits = [...(body ? outbound(body, ctx) : []), ...outbound(tally, ctx)];
    for (const h of hits) process.stdout.write(formatHit(h) + "\n");
    if (hits.some((h) => h.level === "block")) return 2;

    if (!auto) {
      const preview = `${group ? `issue: ${group.url}\n` : `title: ${title}\n${body}`}\n${tally}`;
      const hash = previewHash(preview);
      if (opts["--confirm"] !== hash) {
        process.stdout.write(`${preview}confirm: ${hash}\n`);
        return 3;
      }
    }

    const target = group ?? (await createIssue(title, body!));
    const id = group ? await ownTally(target.number) : null;
    const [method, path] = id === null ? ["POST", `repos/${FEEDBACK_REPO}/issues/${target.number}/comments`] : ["PATCH", `repos/${FEEDBACK_REPO}/issues/comments/${id}`];
    await runGh(["api", "-X", method, path, "-f", `body=${tally}`, "--jq", ".html_url"]);
    recordDecision(repo, { fingerprint: fp, decision: "filed", issue: target.number });
    process.stdout.write(`filed ${fp} ${target.url} ${group ? "existing" : "created"}\n`);
    return 0;
  } catch (e) {
    if (e instanceof UsageError) return usage("file", e);
    if (e instanceof GhError) return fail("file", e.message);
    throw e;
  }
}
