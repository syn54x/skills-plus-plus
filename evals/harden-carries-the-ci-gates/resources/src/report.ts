export type Entry = { date: string; text: string };

export function report(entries: Entry[]): string {
  return entries.map((e) => `${e.date} ${e.text}`).join("\n");
}
