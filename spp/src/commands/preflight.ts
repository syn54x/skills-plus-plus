// spp preflight <epic> [--json]: the Epic's preconditions before a build. Prints one ok line per check and stops
// at the first failure with the fix (exit 1). With --json a pass prints the parsed Routing block instead.
import { runGh } from "../gh.ts";
import { find, guarded, type Issue, parseIssue, UsageError } from "../markers.ts";
import { readRouting, type Routing } from "../routing.ts";

const USAGE = "usage: spp preflight <epic number | issue URL> [--json]\n";
const MIN_GH = [2, 94];

export class Failure extends Error {
  fix: string;
  constructor(message: string, fix: string) {
    super(message);
    this.fix = fix;
  }
}

// The checks in order, each passed one pushed onto `ok`; throws a Failure at the first that fails.
export async function preflight(epic: Issue, ok: string[] = []): Promise<{ file: string; routing: Routing }> {
  const gh = /gh version ((\d+)\.(\d+)\.\S*)/.exec(await runGh(["--version"]));
  const [major, minor] = (gh?.slice(2) ?? []).map(Number);
  if (!gh || major < MIN_GH[0] || (major === MIN_GH[0] && minor < MIN_GH[1])) {
    throw new Failure(`gh ${gh?.[1] ?? "version unknown"} is older than ${MIN_GH.join(".")}`, `upgrade gh to ${MIN_GH.join(".")} or later`);
  }
  ok.push(`gh ${gh[1]} (${MIN_GH.join(".")} or later needed)`);

  const issue = JSON.parse(await runGh(["issue", "view", epic.arg, "--json", "state,subIssuesSummary"])) as { state: string; subIssuesSummary: { total: number } };
  if (issue.state !== "OPEN") throw new Failure(`epic ${epic.label} is ${issue.state.toLowerCase()}`, "reopen the epic, or pick an open one");
  ok.push(`epic ${epic.label} is open`);
  if (issue.subIssuesSummary.total === 0) throw new Failure(`epic ${epic.label} has no Sub-issues`, `run /to-tickets ${epic.arg}`);
  ok.push(`epic ${epic.label} has ${issue.subIssuesSummary.total} Sub-issues`);

  if (!(await find(epic, "<!-- sdd-plan -->"))) throw new Failure(`epic ${epic.label} has no plan comment`, `run /to-tickets ${epic.arg}`);
  ok.push(`epic ${epic.label} has a plan comment`);

  const found = readRouting(process.cwd());
  if (!found) throw new Failure("no Routing block in CLAUDE.md or AGENTS.md", "run /setup-spp");
  ok.push(`Routing block in ${found.file} (mode ${found.routing.mode})`);
  return found;
}

export function run(args: string[]): Promise<number> {
  return guarded(() => "preflight", USAGE, async () => {
    const rest = args.filter((a) => a !== "--json");
    if (rest.length !== 1) throw new UsageError("");
    const epic = parseIssue(rest[0]);
    const ok: string[] = [];
    try {
      const found = await preflight(epic, ok);
      process.stdout.write(args.includes("--json") ? JSON.stringify(found.routing, null, 2) + "\n" : ok.map((l) => `ok: ${l}\n`).join(""));
      return 0;
    } catch (e) {
      if (!(e instanceof Failure)) throw e;
      if (!args.includes("--json")) process.stdout.write(ok.map((l) => `ok: ${l}\n`).join(""));
      process.stderr.write(`fail: ${e.message}\nfix: ${e.fix}\n`);
      return 1;
    }
  });
}
