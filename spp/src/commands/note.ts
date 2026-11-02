// spp note <issue> <text> [--milestone]: appends a one-line note to the local notes log (no GitHub call).
// spp note --list <epic> [--json]: prints the latest note per ticket of the Epic.
// spp note --auto: the PostToolUse and Stop hook. Notes a pull request opened, a Verify run or a stop for the
// ticket of the session's sdd/<N>-* branch, so the worker never has to.
import { guarded, parseIssue, print, UsageError } from "../markers.ts";
import { appendNote, currentRepo } from "../notes.ts";
import { saveProgress } from "./progress.ts";
import { fetchState } from "./status.ts";
import { enterHookCwd, gitOut, readHookInput } from "./verify.ts";

const USAGE = `usage: spp note <issue> <text> [--milestone]
       spp note --list <epic number | issue URL> [--json]
       spp note --auto
<issue> is an issue number in the current repo or a GitHub issue URL. --milestone also writes the text into the
ticket's progress comment as its notes. --list prints the latest note of each ticket of the Epic: the ticket's
issue URL, the text and the time. --auto reads a hook payload on stdin and notes a gh pr create that printed a
pull request URL, a spp verify run, or a stop.
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
  const ticket = /^sdd\/(\d+)/.exec(gitOut("branch", "--show-current") ?? "")?.[1];
  if (!ticket) return;
  let text = "";
  if (stop) text = "stopped";
  else if (pr) {
    const url = /https:\/\/github\.com\/\S+?\/pull\/\d+/.exec(input.tool_response?.stdout ?? "")?.[0];
    if (url) text = `PR open ${url}`;
  } else {
    // The note spp verify left on HEAD, not its output: a failed run may reach this hook with no output at all.
    const state = /^(verified|failed)\b/.exec(gitOut("notes", "--ref=sdd-verify", "show", "HEAD") ?? "")?.[1];
    if (state) text = `Verify ${state === "verified" ? "passed" : "failed"} ${gitOut("rev-parse", "--short=7", "HEAD")}`;
  }
  if (text) appendNote(currentRepo(), Number(ticket), text, false);
}

async function list(args: string[]): Promise<void> {
  const rest = args.filter((a) => a !== "--list" && a !== "--json");
  if (rest.length !== 1) throw new UsageError("");
  const state = await fetchState(rest[0]);
  if (!state) throw new UsageError(`<epic> must be an issue number or a GitHub issue URL: ${rest[0]}`);
  const notes = state.tickets.flatMap((t) => (t.note ? [{ ticket: t.url, text: t.note.text, at: t.note.at }] : []));
  process.stdout.write(args.includes("--json") ? JSON.stringify(notes, null, 2) + "\n" : notes.map((n) => `${n.ticket} ${n.at} ${n.text}\n`).join(""));
}

export function run(args: string[]): Promise<number> {
  return guarded(() => "note", USAGE, async () => {
    if (args.includes("--list")) return void (await list(args));
    if (args.length === 1 && args[0] === "--auto") return void (await auto());
    const milestone = args.includes("--milestone");
    const [arg, text, ...extra] = args.filter((a) => a !== "--milestone");
    if (text === undefined || text.trim() === "" || extra.length) throw new UsageError("");
    const issue = parseIssue(arg);
    appendNote(issue.repo === "{owner}/{repo}" ? currentRepo() : issue.repo, Number(issue.number), text, milestone);
    if (milestone) print(await saveProgress(arg, { notes: text }));
  });
}
