// spp progress <issue> [--status S] [--worker W] [--branch B] [--pr N|URL] [--verify V] [--notes T]: merges the fields
// into the Sub-issue's progress comment and rewrites it in place.
import { type Data, flagPairs, guarded, print, updateMarker, UsageError } from "../markers.ts";

const USAGE = `usage: spp progress <issue> [--status in-progress|pr-open|verify-passed|changes-requested|handed-back]
                           [--worker TEXT] [--branch NAME] [--pr N|URL]
                           [--verify "not-run" | "passed <sha7>" | "failed <sha7>"] [--notes TEXT]
<issue> is an issue number in the current repo or a GitHub issue URL. A field not passed keeps its value.
`;

export const MARKER = "<!-- sdd-progress -->";
const DEFAULT = { status: "in-progress", worker: "", branch: "", pr: null, verify: { state: "not-run", sha: "" }, route: null, reason: "", notes: "" };
const STATUSES = ["in-progress", "pr-open", "verify-passed", "changes-requested", "handed-back"];

// Five lines, the hand-back line, then notes capped at ten lines, so the body stays under 20 lines.
function render(data: Data): string {
  const d = data as typeof DEFAULT & { pr: number | string | null; route: string | null };
  return [
    `**Status:** ${d.status}`,
    `**Worker:** ${d.worker === "" ? "none" : d.worker}`,
    `**Branch:** ${d.branch === "" ? "none" : `\`${d.branch}\``}`,
    `**PR:** ${d.pr === null ? "none" : typeof d.pr === "number" ? `#${d.pr}` : d.pr}`,
    `**Verify:** ${d.verify.state === "not-run" ? "not run" : `${d.verify.state} ${d.verify.sha}`}`,
    ...(d.status === "handed-back" ? [`**Handed back:** ${d.route}: ${d.reason.replace(/\n/g, " ")}`] : []),
    ...(d.notes !== "" ? ["", ...d.notes.split("\n").slice(0, 10)] : []),
  ].join("\n");
}

// Merges `patch` over the stored progress fields and rewrites the comment; returns its URL.
export function saveProgress(issue: string, patch: Data): Promise<string> {
  return updateMarker(issue, MARKER, render, (old) => ({ ...DEFAULT, ...old, ...patch }));
}

export function run(args: string[]): Promise<number> {
  return guarded(() => "progress", USAGE, async () => {
    const [issue, ...rest] = args;
    if (issue === undefined) throw new UsageError("");
    const patch: Data = {};
    for (const [flag, v] of flagPairs(rest, ["--status", "--worker", "--branch", "--pr", "--verify", "--notes"], "progress: ")) {
      if (flag === "--status") {
        if (!STATUSES.includes(v)) throw new UsageError(`--status must be one of ${STATUSES.join(", ")}`);
        patch.status = v;
      } else if (flag === "--pr") {
        const n = v.replace(/^#/, "");
        patch.pr = /^\d+$/.test(n) ? Number(n) : v;
      } else if (flag === "--verify") {
        if (v === "not-run" || v === "not run") patch.verify = { state: "not-run", sha: "" };
        else if (/^(passed|failed) ./.test(v)) patch.verify = { state: v.split(" ")[0], sha: v.split(" ")[1] };
        else throw new UsageError('--verify must be "not-run", "passed <sha7>" or "failed <sha7>"');
      } else patch[flag.slice(2)] = v;
    }
    print(await saveProgress(issue, patch));
  });
}
