interface Entry {
  id: number;
  text: string;
  hidden: boolean;
}

const entries: Entry[] = [];

/** Adds an entry and returns its id, one more than the highest id ever given. */
export function addEntry(text: string): number {
  const id = entries.reduce((high, entry) => Math.max(high, entry.id), 0) + 1;
  entries.push({ id, text, hidden: false });
  return id;
}

/** Hides the entry from the report; it stays in the store. */
export function deleteEntry(id: number): void {
  const entry = entries.find((e) => e.id === id);
  if (entry) entry.hidden = true;
}
