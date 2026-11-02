// Marker comments (ADR 0007): the one writer. A caller names the comment by its marker and says how its data
// changes; this module finds the comment through the API, decodes its trailer, merges, renders the whole body
// and rewrites it in place, or creates it. The trailer is the last line: `<!-- sdd-data: <base64 of JSON> -->`.
import { runGh } from "./gh.ts";
import { readTrailer, TRUSTED_ASSOCIATIONS, trustedAuthor } from "./snapshot.ts";

export { readTrailer };

export type Data = Record<string, unknown>;

// A usage error: the command exits 2 with its usage text.
export class UsageError extends Error {}

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
function viewerLogin(): Promise<string> {
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
async function put(issue: Issue, id: number | null, body: string): Promise<string> {
  const [method, path] = id === null ? ["POST", `repos/${issue.repo}/issues/${issue.number}/comments`] : ["PATCH", `repos/${issue.repo}/issues/comments/${id}`];
  return (await runGh(["api", "-X", method, path, "-f", `body=${body}`, "--jq", ".html_url"])).trim();
}

// Writes `body` verbatim as the comment that starts with `marker` (the one-writer comments: summary, retro).
export async function upsertComment(arg: string, marker: string, body: string): Promise<string> {
  const issue = parseIssue(arg);
  return put(issue, (await find(issue, marker))?.id ?? null, body);
}

// Reads the marker comment's trailer ({} when there is no comment or no trailer), passes it to `merge`, and
// rewrites the comment as the marker, the rendered lines and the new trailer. `merge` may throw a UsageError.
export async function updateMarker(arg: string, marker: string, render: (data: Data) => string, merge: (old: Data) => Data): Promise<string> {
  const issue = parseIssue(arg);
  const found = await find(issue, marker);
  const old = found ? readTrailer(found.body) : {};
  if (old === null) throw new TrailerError(`${marker} on ${issue.label} has an sdd-data trailer that does not decode; refusing to overwrite it`);
  const data = merge(old);
  const trailer = `<!-- sdd-data: ${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
  return put(issue, found?.id ?? null, [marker, render(data), trailer].filter(Boolean).join("\n") + "\n");
}

// The shallow form: `data`'s fields replace the stored ones, every other field keeps its value.
export function writeMarker(issue: string, marker: string, render: (data: Data) => string, data: Data): Promise<string> {
  return updateMarker(issue, marker, render, (old) => ({ ...old, ...data }));
}
