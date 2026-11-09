/**
 * `spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d] [--narrowed TEXT]... |
 * [--narrowed none] [--add-deviation TEXT] [--table-file FILE] [--driver desktop|bg|subagent] [--by "<skill> <step>"]` writes the Epic's `<!-- sdd-plan -->` comment,
 * rewriting it in place, and prints its URL. A field you do not pass keeps its stored value. `--narrowed` replaces the
 * stored list with every `--narrowed` of the call, `--narrowed none` clears it, and a call without it keeps it;
 * `--add-deviation` appends to the Deviated list. `--driver` records the Driver the user chose for the run, which
 * `spp next` then reports on `dispatch`. The table file is copied in verbatim. The trailer's `by` records the
 * write's maker: to-tickets, or the skill and step `--by` names. It has no `--json`.
 *
 * Each `--add-deviation` also records a `contract-edited` Signal. When the text starts with an issue (`#N`, `N`,
 * `owner/repo#N` or an issue URL, a trailing `:` allowed) it is charged to the maker of that issue's Verify pin (harden
 * when it names none); otherwise to the maker of the plan comment before this write (to-tickets when it names none).
 * It records nothing under `CI`, outside an Attended session, or when the Self-improvement mode of this checkout, or of
 * another repo whose issue it is about, is Off. A Signal goes to this checkout's log, and a failure
 * while recording is one `signal not recorded:` line on stderr that leaves the exit code as it was.
 *
 * @module
 */
import { existsSync, readFileSync } from "node:fs";
import { deviationCorrections } from "../corrections.ts";
import { asDriver } from "../derive.ts";
import { type By, type Data, flagPairs, guarded, parseBy, print, updateMarker, UsageError } from "../markers.ts";

/** The usage text `spp plan --help` prints. */
export const USAGE = `usage: spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d]
                       [--narrowed TEXT]... | [--narrowed none] [--add-deviation TEXT] [--table-file FILE]
                       [--driver desktop|bg|subagent] [--by "<skill> <step>"]
--narrowed replaces the stored list with every --narrowed of the call, --narrowed none clears it, and a
call without --narrowed keeps it; --add-deviation appends. --driver records the run's Driver.
--by records the write as that skill's (default to-tickets), the rest of the value as its step.
`;

const DEFAULT = { goal: "", constraints: "", branch: "", repos: [] as string[], narrowed: [] as string[], deviated: [] as string[], table: "" };
// Absent from DEFAULT so a plan with no Driver keeps the trailer it had.
type Plan = typeof DEFAULT & { driver?: string };

function render(data: Data): string {
  const d = data as Plan;
  return [
    "## Plan",
    "",
    `**Goal:** ${d.goal}`,
    `**Constraints:** ${d.constraints}`,
    ...(d.branch !== "" ? [`**Integration branch:** \`${d.branch}\``] : []),
    ...(d.driver ? [`**Driver:** ${d.driver}`] : []),
    ...(d.table !== "" ? ["", d.table.replace(/\n$/, ""), ""] : []),
    ...(d.repos.length ? [`**Repos:** ${d.repos.join(", ")}`] : []),
    ...d.narrowed.map((n) => `**Narrowed:** ${n}`),
    ...d.deviated.map((n) => `**Deviated:** ${n}`),
  ].join("\n");
}

/**
 * Merges the given fields into the Epic's plan comment.
 *
 * @param args - The Epic (an issue number in the current repo or an issue URL), then any of the flags above.
 * @returns 0 when the comment is written; 2 on a usage error, with the usage on stderr; 1 when `gh` fails or the
 *   stored trailer does not decode, with the reason on stderr.
 * @example
 * ```bash
 * spp plan 197 --branch feat/rebuild --add-deviation "#202: an unreadable trailer stops the write"
 * spp plan 197 --driver subagent
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "plan", USAGE, async () => {
    const [epic, ...rest] = args;
    if (epic === undefined) throw new UsageError("");
    const patch: Partial<Plan> = {};
    const added: string[] = [];
    let by: By | undefined;
    for (const [flag, v] of flagPairs(rest, ["--goal", "--constraints", "--branch", "--repos", "--narrowed", "--add-deviation", "--table-file", "--driver", "--by"], "plan: ")) {
      if (flag === "--by") by = parseBy(v);
      else if (flag === "--repos") patch.repos = v.split(",");
      else if (flag === "--narrowed") patch.narrowed = v === "none" ? [] : [...(patch.narrowed ?? []), v];
      else if (flag === "--add-deviation") added.push(v);
      else if (flag === "--table-file") {
        if (!existsSync(v)) throw new UsageError(`no table file: ${v}`);
        patch.table = readFileSync(v, "utf8").replace(/\n+$/, "");
      } else if (flag === "--driver" && !asDriver(v)) throw new UsageError(`unknown driver ${v}`);
      else patch[flag.slice(2) as "goal" | "constraints" | "branch" | "driver"] = v;
    }
    const { url, before } = await updateMarker(epic, "<!-- sdd-plan -->", render, (old) => {
      const data = { ...DEFAULT, ...old, ...patch };
      data.deviated = [...(data.deviated as string[]), ...added];
      return data;
    }, by);
    print(url);
    if (added.length) await deviationCorrections(epic, added, before);
  });
}
