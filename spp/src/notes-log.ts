// The local notes log's place and format, shared by notes.ts, which writes and reads it through Node, and the epic
// board, which reads it through the host. Pure: no network, filesystem or environment.

export type Note = { repo: string; ticket: number; text: string; at: string; milestone: boolean };

// $XDG_STATE_HOME/spp, else $HOME/.local/state/spp; owner/repo becomes owner__repo, so each repository has one flat file.
export const notesFile = (env: { XDG_STATE_HOME?: string; HOME: string }, repo: string) =>
  `${env.XDG_STATE_HOME || `${env.HOME}/.local/state`}/spp/${repo.replace("/", "__")}.jsonl`;

// The newest note of each ticket in a log's text, by ticket number.
export function latestNotes(text: string): Map<number, Note> {
  const notes = new Map<number, Note>();
  for (const line of text.split("\n")) {
    try {
      const n = JSON.parse(line) as Note;
      notes.set(n.ticket, n);
    } catch {} // a torn or blank line is skipped, never fatal
  }
  return notes;
}
