// spp plan <epic> [--goal] [--constraints] [--branch] [--repos] [--narrowed TEXT]... | [--narrowed none]
//               [--add-deviation TEXT] [--table-file FILE]: owns the Epic's plan comment.
import { existsSync, readFileSync } from "node:fs";
import { type Data, flagPairs, guarded, print, updateMarker, UsageError } from "../markers.ts";

const USAGE = `usage: spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d]
                       [--narrowed TEXT]... | [--narrowed none] [--add-deviation TEXT] [--table-file FILE]
--narrowed replaces the stored list with every --narrowed of the call, --narrowed none clears it, and a
call without --narrowed keeps it; --add-deviation appends.
`;

const DEFAULT = { goal: "", constraints: "", branch: "", repos: [] as string[], narrowed: [] as string[], deviated: [] as string[], table: "" };

function render(data: Data): string {
  const d = data as typeof DEFAULT;
  return [
    "## Plan",
    "",
    `**Goal:** ${d.goal}`,
    `**Constraints:** ${d.constraints}`,
    ...(d.branch !== "" ? [`**Integration branch:** \`${d.branch}\``] : []),
    ...(d.table !== "" ? ["", d.table.replace(/\n$/, ""), ""] : []),
    ...(d.repos.length ? [`**Repos:** ${d.repos.join(", ")}`] : []),
    ...d.narrowed.map((n) => `**Narrowed:** ${n}`),
    ...d.deviated.map((n) => `**Deviated:** ${n}`),
  ].join("\n");
}

export function run(args: string[]): Promise<number> {
  return guarded(() => "plan", USAGE, async () => {
    const [epic, ...rest] = args;
    if (epic === undefined) throw new UsageError("");
    const patch: Partial<typeof DEFAULT> = {};
    const added: string[] = [];
    for (const [flag, v] of flagPairs(rest, ["--goal", "--constraints", "--branch", "--repos", "--narrowed", "--add-deviation", "--table-file"], "plan: ")) {
      if (flag === "--repos") patch.repos = v.split(",");
      else if (flag === "--narrowed") patch.narrowed = v === "none" ? [] : [...(patch.narrowed ?? []), v];
      else if (flag === "--add-deviation") added.push(v);
      else if (flag === "--table-file") {
        if (!existsSync(v)) throw new UsageError(`no table file: ${v}`);
        patch.table = readFileSync(v, "utf8").replace(/\n+$/, "");
      } else patch[flag.slice(2) as "goal" | "constraints" | "branch"] = v;
    }
    print(
      await updateMarker(epic, "<!-- sdd-plan -->", render, (old) => {
        const data = { ...DEFAULT, ...old, ...patch };
        data.deviated = [...(data.deviated as string[]), ...added];
        return data;
      }),
    );
  });
}
