// Marker comments (ADR 0007): the one writer. A caller names the comment by its marker and says how its data
// changes; this module finds the comment through the API, decodes its trailer, merges, renders the whole body
// and rewrites it in place, or creates it. The trailer is the last line: `<!-- sdd-data: <base64 of JSON> -->`.
import { runGh } from "./gh.ts";
import { currentRepo } from "./notes.ts";
import { pluginVersion, recordRun } from "./signals.ts";
import { encodeTrailer, readTrailer, TRUSTED_ASSOCIATIONS, trustedAuthor } from "./snapshot.ts";

export { readTrailer };

export type Data = Record<string, unknown>;

// The Sub-issue's progress comment's marker, kept here so that pin.ts can name it without importing
// commands/progress.ts, which imports pin.ts.
export const PROGRESS_MARKER = "<!-- sdd-progress -->";

// A usage error: the command exits 2 with its usage text.
export class UsageError extends Error {}

/**
 * A Marker comment's maker as `readMaker` returns it: the skill, the step `--by` named (null when none did) and the
 * plugin version. On the wire it is `{"skill", "version", "step"?}`, under `by` for the comment's last write and under
 * `verifyPinBy` for the progress comment's Verify pin.
 */
export type Maker = { skill: string; step: string | null; version: string };

// The skill a write is charged to when no `--by` names one, by the marker it writes. The Verify pin lives in the
// progress comment but is harden's, so pin writes name their skill themselves.
const MAKERS: Record<string, string> = {
  "<!-- sdd-plan -->": "to-tickets",
  "<!-- sdd-wave -->": "build",
  "<!-- spp-verdict -->": "review",
  [PROGRESS_MARKER]: "implement-issue",
};

// A `--by "<skill> <step>"` value as the writers take it.
export type By = { skill?: string; step?: string };

// Parses `--by`: its first word is the skill, the rest of the value the step.
export function parseBy(value: string): By {
  const [skill, ...step] = value.trim().split(/\s+/);
  if (!/^[a-z][a-z-]*$/.test(skill)) throw new UsageError(`--by must start with a lowercase skill name: ${JSON.stringify(value)}`);
  return step.length ? { skill, step: step.join(" ") } : { skill };
}

/**
 * The maker a decoded trailer records: its `by`, or with `"verifyPin"` its `verifyPinBy`. Null when that field is
 * missing or lacks a string skill and version, as on every trailer written before makers were recorded.
 */
export function readMaker(data: Record<string, unknown> | null, field?: "verifyPin"): Maker | null {
  const m = data?.[field ? `${field}By` : "by"] as Record<string, unknown> | null | undefined;
  if (typeof m?.skill !== "string" || typeof m.version !== "string") return null;
  return { skill: m.skill, step: typeof m.step === "string" ? m.step : null, version: m.version };
}

// A trailer that does not decode. Rendering fresh would erase the state, so the write stops (exit 1).
export class TrailerError extends Error {}

// An issue as the commands take it: a number in the current repo (gh fills {owner}/{repo}) or an issue URL.
export type Issue = { arg: string; repo: string; number: string; label: string; repoFlag: string[] };

export function parseIssue(arg: string | undefined): Issue {
  if (arg === undefined) throw new UsageError("");
  if (/^\d+$/.test(arg)) return { arg, repo: "{owner}/{repo}", number: arg, label: `#${arg}`, repoFlag: [] };
  const m = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)$/.exec(arg);
  if (!m) throw new UsageError(`<issue> must be an issue number or a GitHub issue URL: ${arg}`);
  return { arg, repo: m[1], number: m[2], label: `${m[1]}#${m[2]}`, repoFlag: ["-R", m[1]] };
}

/**
 * The issue's real `owner/repo`: its URL's, or for a bare number the current checkout's, `own` when the caller has
 * already resolved it, else its origin (throws without one).
 */
export const issueRepo = (issue: Issue, own?: string): string => (issue.repo === "{owner}/{repo}" ? (own ?? currentRepo()) : issue.repo);

// Runs a command body; a UsageError prints `spp <name>: <reason>` and the usage text, and exits 2.
export async function guarded(name: () => string, usage: string, body: () => Promise<number | void>): Promise<number> {
  try {
    return (await body()) ?? 0;
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    process.stderr.write((e.message ? `spp ${name()}: ${e.message}\n` : "") + usage);
    return 2;
  }
}

// `--flag value` pairs, in order. Every flag takes a value and must be one of `known`.
export function flagPairs(args: string[], known: string[], where = ""): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < args.length; i += 2) {
    if (!known.includes(args[i])) throw new UsageError(`${where}unknown flag ${args[i]}`);
    if (i + 1 >= args.length) throw new UsageError(`${args[i]} needs a value`);
    pairs.push([args[i], args[i + 1]]);
  }
  return pairs;
}

export function print(url: string): void {
  if (url) process.stdout.write(url + "\n");
}

let viewer: Promise<string> | undefined;

// The gh user's login, asked at most once per run.
export function viewerLogin(): Promise<string> {
  return (viewer ??= runGh(["api", "graphql", "-f", "query=query Viewer { viewer { login } }", "--jq", ".data.viewer.login"]).then((s) => s.trim()));
}

// The first comment on the issue whose body starts with the marker and whose author spp trusts (ADR 0009); a forged
// one before it is skipped. The gh user is looked up only when an author's association does not settle it.
export async function find(issue: Issue, marker: string): Promise<{ id: number; body: string } | null> {
  const jq = ".[] | [.id, .body, .user.login, .author_association] | @json";
  const out = await runGh(["api", `repos/${issue.repo}/issues/${issue.number}/comments`, "--paginate", "--jq", jq]);
  for (const line of out.split("\n").filter(Boolean)) {
    const [id, body, login, association] = JSON.parse(line) as [number, string, string | null, string];
    if (!body.startsWith(marker)) continue;
    if (trustedAuthor(login, association, TRUSTED_ASSOCIATIONS.includes(association) ? null : await viewerLogin())) return { id, body };
  }
  return null;
}

// Rewrites the found comment with `body`, or creates one; returns its URL.
export async function put(issue: Issue, id: number | null, body: string): Promise<string> {
  const [method, path] = id === null ? ["POST", `repos/${issue.repo}/issues/${issue.number}/comments`] : ["PATCH", `repos/${issue.repo}/issues/comments/${id}`];
  return (await runGh(["api", "-X", method, path, "-f", `body=${body}`, "--jq", ".html_url"])).trim();
}

// A write's maker as every trailer records it: the skill, the step when there is one, and the plugin version.
const makerOf = (skill: string, step?: string): Data => ({ skill, version: pluginVersion(), ...(step && { step }) });

/**
 * The text of a person's own marked comment: the marker, the rendered text, a blank line, then the trailer holding
 * `data` and the maker `by` stamped as on Marker comments. A preview shows this, and {@link writeOwnMarker} posts it.
 */
export function ownMarkerBody(marker: string, render: string, data: Data, by: { skill: string; step?: string }): string {
  return `${marker}\n${render}\n\n${encodeTrailer({ ...data, by: makerOf(by.skill, by.step) })}\n`;
}

/**
 * Creates or rewrites the gh user's own comment on the issue that starts with `marker` and whose trailer holds the
 * same `data[key]`, as {@link ownMarkerBody} writes it; returns its URL. Several people each keep one such comment
 * per key (a tally per person and repo), so another author's, or the user's own under another key, is never touched.
 */
export async function writeOwnMarker(arg: string, marker: string, key: string, render: string, data: Data, by: { skill: string; step?: string }): Promise<string> {
  const issue = parseIssue(arg);
  const me = await viewerLogin();
  const out = await runGh(["api", `repos/${issue.repo}/issues/${issue.number}/comments`, "--paginate", "--jq", ".[] | [.id, .body, .user.login] | @json"]);
  let id: number | null = null;
  for (const line of out.split("\n").filter(Boolean)) {
    const [cid, body, login] = JSON.parse(line) as [number, string, string | null];
    if (body.startsWith(marker) && login === me && readTrailer(body)?.[key] === data[key]) {
      id = cid;
      break;
    }
  }
  return put(issue, id, ownMarkerBody(marker, render, data, by));
}

// Writes `body` verbatim as the comment that starts with `marker` (the one-writer comments: summary, retro).
export async function upsertComment(arg: string, marker: string, body: string): Promise<string> {
  const issue = parseIssue(arg);
  return put(issue, (await find(issue, marker))?.id ?? null, body);
}

// Reads the marker comment's trailer ({} when there is no comment or no trailer), passes it to `merge`, and
// rewrites the comment as the marker, the rendered lines and the new trailer. The trailer's `by` is this write's
// maker (`by`'s skill or else the marker's, `by`'s step, the plugin version), which `merge` also receives so that a
// pin write can copy it. `merge` may throw a UsageError. Returns the comment's URL and `before`, the trailer as it
// stood before this write, which a correction charged to the replaced write's maker reads.
export async function updateMarker(
  arg: string,
  marker: string,
  render: (data: Data) => string,
  merge: (old: Data, maker: Data) => Data,
  by: By = {},
): Promise<{ url: string; before: Data }> {
  const issue = parseIssue(arg);
  const found = await find(issue, marker);
  const old = found ? readTrailer(found.body) : {};
  if (old === null) throw new TrailerError(`${marker} on ${issue.label} has an sdd-data trailer that does not decode; refusing to overwrite it`);
  const maker = makerOf(by.skill ?? MAKERS[marker], by.step);
  const data = { ...merge(old, maker), by: maker };
  const url = await put(issue, found?.id ?? null, [marker, render(data), encodeTrailer(data)].filter(Boolean).join("\n") + "\n");
  await countRun(issue, marker, readMaker(old), data); // old is {} on a create, so its maker is null
  return { url, before: old };
}

// A run is one artifact a skill step made or took over: a write that created the comment, or changed the skill or
// step of its maker. recordRun never throws, so recording it never fails the write, and it resolves the issue's repo
// only once its gate says yes.
async function countRun(issue: Issue, marker: string, before: Maker | null, data: Data): Promise<void> {
  const after = readMaker(data);
  if (!after || (before?.skill === after.skill && before.step === after.step)) return;
  await recordRun((own) => {
    const about = issueRepo(issue, own);
    return { about, skill: after.skill, step: after.step ?? "", artifact: `${about}#${issue.number} ${marker}` };
  });
}

// The shallow form: `data`'s fields replace the stored ones, every other field keeps its value. Returns the URL.
export async function writeMarker(issue: string, marker: string, render: (data: Data) => string, data: Data, by?: By): Promise<string> {
  return (await updateMarker(issue, marker, render, (old) => ({ ...old, ...data }), by)).url;
}
