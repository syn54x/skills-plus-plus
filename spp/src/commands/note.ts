// spp note <issue> <text> [--milestone]: appends a one-line note to the local notes log (no GitHub call).
// spp note --list <epic> [--json]: prints the latest note per ticket of the Epic.
import { guarded, parseIssue, print, UsageError } from "../markers.ts";
import { appendNote, currentRepo } from "../notes.ts";
import { saveProgress } from "./progress.ts";
import { fetchState } from "./status.ts";

const USAGE = `usage: spp note <issue> <text> [--milestone]
       spp note --list <epic number | issue URL> [--json]
<issue> is an issue number in the current repo or a GitHub issue URL. --milestone also writes the text into the
ticket's progress comment as its notes. --list prints the latest note of each ticket of the Epic: the ticket's
issue URL, the text and the time.
`;

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
    const milestone = args.includes("--milestone");
    const [arg, text, ...extra] = args.filter((a) => a !== "--milestone");
    if (text === undefined || text.trim() === "" || extra.length) throw new UsageError("");
    const issue = parseIssue(arg);
    appendNote(issue.repo === "{owner}/{repo}" ? currentRepo() : issue.repo, Number(issue.number), text, milestone);
    if (milestone) print(await saveProgress(arg, { notes: text }));
  });
}
