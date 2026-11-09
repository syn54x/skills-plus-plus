/**
 * `spp note` keeps a local log of one-line notes, keyed by repo and Sub-issue, in spp's own state directory outside
 * every repository: it appends a note, lists the latest notes of an Epic, or notes a hook event.
 *
 * Its three forms:
 *
 * - `spp note <issue> <text> [--milestone]` appends a note with no GitHub call; `--milestone` also writes the text
 *   into the progress comment's notes.
 * - `spp note --list <epic> [--json]` prints the latest note of each Sub-issue of the Epic; with `--json`, a
 *   {@link LatestNote} list.
 * - `spp note --auto` is for the `PostToolUse` and `Stop` hooks: it reads the hook payload on stdin and notes a pull
 *   request opened, a `spp verify` run or a stop for the ticket of the session's `sdd/<N>-*` branch, so the worker
 *   never has to. A stop that `spp verify --check` refuses is not noted, since the worker keeps going.
 *
 * @module
 */
import { workerTicket } from "../attended.ts";
import { guarded, issueRepo, parseIssue, print, UsageError } from "../markers.ts";
import { appendNote, currentRepo } from "../notes.ts";
import { saveProgress } from "./progress.ts";
import { fetchState } from "./status.ts";
import { enterHookCwd, gitOut, readHookInput, stopRefusal } from "./verify.ts";

/** The latest note of one Sub-issue: an entry of the `spp note --list --json` list. */
export type LatestNote = {
  /** The Sub-issue's URL. */
  ticket: string;
  /** The note. */
  text: string;
  /** When it was written, as an ISO time. */
  at: string;
};

/** The usage text `spp note --help` prints. */
export const USAGE = `usage: spp note <issue> <text> [--milestone]
       spp note --list <epic number | issue URL> [--json]
       spp note --auto
<issue> is an issue number in the current repo or a GitHub issue URL. --milestone also writes the text into the
ticket's progress comment as its notes. --list prints the latest note of each ticket of the Epic: the ticket's
issue URL, the text and the time. --auto reads a hook payload on stdin and notes a gh pr create that printed a
pull request URL, a spp verify run, or a stop that spp verify --check lets through.
`;

async function auto(): Promise<void> {
  const input = await readHookInput();
  const command = input.tool_input?.command ?? "";
  const stop = input.hook_event_name === "Stop";
  // This runs after every Bash call, so anything else leaves before git is asked.
  const pr = /\bgh\s+pr\s+create\b/.test(command);
  const verify = /\bspp"?\s+verify\s+(?!--check)\S/.test(command);
  if (!stop && !pr && !verify) return;
  enterHookCwd(input);
  const ticket = workerTicket(process.cwd());
  if (!ticket) return;
  let text = "";
  if (stop && stopRefusal()) return; // verify --check refuses this stop beside us, so the worker keeps going
  if (stop) text = "stopped";
  else if (pr) {
    const url = /https:\/\/github\.com\/\S+?\/pull\/\d+/.exec(input.tool_response?.stdout ?? "")?.[0];
    if (url) text = `PR open ${url}`;
  } else {
    // The note spp verify left on HEAD, not its output: a failed run may reach this hook with no output at all.
    const state = /^(verified|failed)\b/.exec(gitOut("notes", "--ref=sdd-verify", "show", "HEAD") ?? "")?.[1];
    if (state) text = `Verify ${state === "verified" ? "passed" : "failed"} ${gitOut("rev-parse", "--short=7", "HEAD")}`;
  }
  if (text) appendNote(currentRepo(), ticket, text, false);
}

async function list(args: string[]): Promise<void> {
  const rest = args.filter((a) => a !== "--list" && a !== "--json");
  if (rest.length !== 1) throw new UsageError("");
  const state = await fetchState(rest[0]);
  if (!state) throw new UsageError(`<epic> must be an issue number or a GitHub issue URL: ${rest[0]}`);
  const notes: LatestNote[] = state.tickets.flatMap((t) => (t.note ? [{ ticket: t.url, text: t.note.text, at: t.note.at }] : []));
  process.stdout.write(args.includes("--json") ? JSON.stringify(notes, null, 2) + "\n" : notes.map((n) => `${n.ticket} ${n.at} ${n.text}\n`).join(""));
}

/**
 * Appends a note, lists the latest notes of an Epic, or notes a hook event.
 *
 * @param args - `<issue> <text>` with `--milestone` to mirror it into the progress comment; or `--list <epic>` with
 *   `--json` for a {@link LatestNote} list; or `--auto` alone.
 * @returns 0 when the note is written or the list printed (`--auto` exits 0 when there is nothing to note); 2 on a
 *   usage error, with the usage on stderr; 1 when `gh` fails, with the reason on stderr.
 * @example
 * ```bash
 * spp note 265 "tests red, writing the router change"
 * spp note --list 197 --json
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "note", USAGE, async () => {
    if (args.includes("--list")) return void (await list(args));
    if (args.length === 1 && args[0] === "--auto") return void (await auto());
    const milestone = args.includes("--milestone");
    const [arg, text, ...extra] = args.filter((a) => a !== "--milestone");
    if (text === undefined || text.trim() === "" || extra.length) throw new UsageError("");
    const issue = parseIssue(arg);
    appendNote(issueRepo(issue), Number(issue.number), text, milestone);
    if (milestone) print((await saveProgress(arg, { notes: text })).url);
  });
}
