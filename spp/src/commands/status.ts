// spp status <epic> [--json]: the state of every Sub-issue of an Epic, from one GraphQL query.
import { derive, type EpicState } from "../derive.ts";
import { GhError, runGh } from "../gh.ts";
import { attachNotes } from "../notes.ts";
import { SNAPSHOT_QUERY, parseSnapshot } from "../snapshot.ts";

const USAGE = "usage: spp status <epic number | issue URL> [--json]\n";

// The query variables for an Epic given as a number (the current repo, through gh's placeholders) or an issue URL.
function variables(epic: string): string[] | null {
  if (/^\d+$/.test(epic)) return ["-F", "owner={owner}", "-F", "repo={repo}", "-F", `number=${epic}`];
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/.exec(epic);
  return m ? ["-f", `owner=${m[1]}`, "-f", `repo=${m[2]}`, "-F", `number=${m[3]}`] : null;
}

function missingIssue(stdout: string): boolean {
  try {
    return JSON.parse(stdout)?.data?.repository?.issue === null;
  } catch {
    return false;
  }
}

function render(s: EpicState): string {
  const ref = (url: string) => {
    const [, repo, n] = /([^/]+\/[^/]+)\/(?:issues|pull)\/(\d+)$/.exec(url) ?? [, url, ""];
    return repo === s.epic.repo ? `#${n}` : `${repo}#${n}`;
  };
  const byUrl = new Map(s.tickets.map((t) => [t.url, t]));
  const line = (url: string) => {
    const t = byUrl.get(url)!;
    return `  ${t.state.padEnd(11)} ${ref(t.url)} ${t.title}${t.pr ? ` (PR ${ref(t.pr.url)})` : ""}`;
  };
  const groups: [string, string[]][] = s.layers.map((urls, i) => [`Layer ${i}`, urls]);
  if (s.cycle.length) groups.push(["Cycle", s.cycle]);
  const lines = [`${s.epic.repo}#${s.epic.number} ${s.epic.title}`, ...groups.flatMap(([head, urls]) => [head, ...urls.map(line)])];
  return lines.join("\n") + "\n";
}

// The Epic's derived state with each ticket's latest local note, or null when `epic` is not a number or issue URL.
export async function fetchState(epic: string): Promise<EpicState | null> {
  const vars = variables(epic);
  if (!vars) return null;
  let out: string;
  try {
    out = await runGh(["api", "graphql", "-f", `query=${SNAPSHOT_QUERY}`, ...vars]);
  } catch (e) {
    // gh exits 1 on a missing issue but still prints the response, which parseSnapshot reports as "epic not found".
    if (!(e instanceof GhError) || !missingIssue(e.stdout)) throw e;
    out = e.stdout;
  }
  return attachNotes(derive(parseSnapshot(JSON.parse(out))));
}

export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  const state = rest.length === 1 ? await fetchState(rest[0]) : null;
  if (!state) {
    process.stderr.write(USAGE);
    return 2;
  }
  process.stdout.write(args.includes("--json") ? JSON.stringify(state, null, 2) + "\n" : render(state));
  return 0;
}
