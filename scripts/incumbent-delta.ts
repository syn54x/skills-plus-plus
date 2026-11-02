#!/usr/bin/env node
// Prints what the incumbents shipped since the Incumbent watch issue's cursor, as JSON.
// Usage: node scripts/incumbent-delta.ts [--issue <N>] [--watchlist <path>] [--now <ISO date>]
// The cursor (incumbent name to the ISO date of its newest item already seen) lives in the issue
// body's data trailer. With no --issue the window is the last 90 days. Output:
// { items, cursor } plus an errors object (incumbent to message) only when a gh call failed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Incumbent = {
  name: string;
  repo?: string;
  releases: boolean;
  changelog?: string;
  read?: string[];
};
export type Item = {
  incumbent: string;
  kind: "release" | "commit";
  ref: string;
  date: string;
  title: string;
  url: string;
};
export type Delta = { items: Item[]; cursor: Record<string, string>; errors?: Record<string, string> };
export type Gh = (args: string[]) => string;

const WINDOW_DAYS = 90;
const TRAILER = /^<!-- sdd-data: ([A-Za-z0-9+/=]+) -->$/;

const defaultGh: Gh = (args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

// The cursor stored in a body's data trailer; {} when there is no trailer, an error when it does not decode.
export function readCursor(body: string): Record<string, string> {
  const line = body
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .findLast((l) => l.startsWith("<!-- sdd-data:"));
  if (line === undefined) return {};
  const match = TRAILER.exec(line);
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(match?.[1] ?? "", "base64").toString("utf8"));
  } catch {
    data = undefined;
  }
  const cursor = (data as { cursor?: unknown } | null)?.cursor;
  if (!match || typeof data !== "object" || data === null || typeof cursor !== "object" || cursor === null)
    throw new Error("the issue's data trailer does not decode to an object with a cursor");
  return cursor as Record<string, string>;
}

export function readWatchlist(markdown: string): Incumbent[] {
  const block = /```json\n([\s\S]*?)\n```/.exec(markdown);
  if (!block) throw new Error("the watchlist has no json block");
  return JSON.parse(block[1]);
}

// shortcut: reads the newest 30 releases and commits per incumbent, upgrade to paging if a weekly run ever hits 30.
function releaseItems(incumbent: Incumbent, gh: Gh): Item[] {
  const rows = JSON.parse(gh(["api", `repos/${incumbent.repo}/releases?per_page=30`]));
  return rows
    .filter((r: { draft: boolean }) => !r.draft)
    .map((r: { tag_name: string; name: string; published_at: string; html_url: string }) => ({
      incumbent: incumbent.name,
      kind: "release" as const,
      ref: r.tag_name,
      date: r.published_at,
      title: r.name || r.tag_name,
      url: r.html_url,
    }));
}

function commitItems(incumbent: Incumbent, since: string, gh: Gh): Item[] {
  const query = `path=${encodeURIComponent(incumbent.changelog!)}&since=${encodeURIComponent(since)}&per_page=30`;
  const rows = JSON.parse(gh(["api", `repos/${incumbent.repo}/commits?${query}`]));
  return rows.map(
    (c: { sha: string; commit: { committer: { date: string }; message: string }; html_url: string }) => ({
      incumbent: incumbent.name,
      kind: "commit" as const,
      ref: c.sha.slice(0, 7),
      date: c.commit.committer.date,
      title: c.commit.message.split("\n")[0],
      url: c.html_url,
    }),
  );
}

export function delta(opts: {
  watchlist: Incumbent[];
  cursor: Record<string, string>;
  now: Date;
  gh: Gh;
}): Delta {
  const { watchlist, now, gh } = opts;
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString();
  const items: Item[] = [];
  const cursor = { ...opts.cursor };
  const errors: Record<string, string> = {};

  for (const incumbent of watchlist) {
    if (!incumbent.repo) continue;
    const since = opts.cursor[incumbent.name] ?? windowStart;
    try {
      const found = [
        ...(incumbent.releases ? releaseItems(incumbent, gh) : []),
        ...(incumbent.changelog ? commitItems(incumbent, since, gh) : []),
      ].filter((item) => Date.parse(item.date) > Date.parse(since));
      if (found.length === 0) continue;
      items.push(...found);
      cursor[incumbent.name] = found.map((i) => i.date).reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
    } catch (error) {
      errors[incumbent.name] = error instanceof Error ? error.message : String(error);
    }
  }

  items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return Object.keys(errors).length ? { items, cursor, errors } : { items, cursor };
}

function main(argv: string[]): void {
  const arg = (flag: string) => argv[argv.indexOf(flag) + 1];
  const has = (flag: string) => argv.includes(flag);
  const watchlistPath = has("--watchlist")
    ? arg("--watchlist")
    : join(dirname(fileURLToPath(import.meta.url)), "..", ".agents", "incumbents.md");
  const cursor = has("--issue")
    ? readCursor(defaultGh(["issue", "view", arg("--issue"), "--json", "body", "--jq", ".body"]))
    : {};
  const out = delta({
    watchlist: readWatchlist(readFileSync(watchlistPath, "utf8")),
    cursor,
    now: has("--now") ? new Date(arg("--now")) : new Date(),
    gh: defaultGh,
  });
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

if (import.meta.main) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`incumbent-delta: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
