/**
 * `spp progress <issue> [--status S] [--worker TEXT] [--branch NAME] [--pr N|URL] [--verify V] [--notes TEXT]` writes
 * the Sub-issue's one `<!-- sdd-progress -->` comment, rewriting it in place, and prints its URL. A field you do not
 * pass keeps its stored value. The comment's data trailer holds the fields (ADR 0007); a trailer that does not decode
 * stops the write rather than erase the state. It has no `--json`.
 *
 * @module
 */
import { type Data, flagPairs, guarded, print, updateMarker, UsageError } from "../markers.ts";
import { PIN_KEY } from "../pin.ts";

/** The usage text `spp progress --help` prints. */
export const USAGE = `usage: spp progress <issue> [--status in-progress|pr-open|verify-passed|changes-requested|handed-back]
                           [--worker TEXT] [--branch NAME] [--pr N|URL]
                           [--verify "not-run" | "passed <sha7>" | "failed <sha7>"] [--notes TEXT]
<issue> is an issue number in the current repo or a GitHub issue URL. A field not passed keeps its value.
`;

/**
 * The progress comment's marker, its first line.
 *
 * @internal
 */
export const MARKER = "<!-- sdd-progress -->";
const DEFAULT = { status: "in-progress", worker: "", branch: "", pr: null, verify: { state: "not-run", sha: "" }, route: null, reason: "", notes: "" };
const STATUSES = ["in-progress", "pr-open", "verify-passed", "changes-requested", "handed-back"];

/**
 * Renders the progress comment's lines from its data: five lines, the hand-back line, the Verify pin, then notes
 * capped at ten lines, so the body stays under 20 lines. A comment hardening created holds only the pin until a
 * worker writes the rest.
 *
 * @internal
 */
export function renderProgress(data: Data): string {
  const d = data as typeof DEFAULT & { pr: number | string | null; route: string | null };
  const verifyPin = data[PIN_KEY];
  const pin = typeof verifyPin === "string" && verifyPin ? [`**Verify pin:** \`${verifyPin.slice(0, 12)}\``] : [];
  if (d.status === undefined) return pin.join("\n");
  return [
    `**Status:** ${d.status}`,
    `**Worker:** ${d.worker === "" ? "none" : d.worker}`,
    `**Branch:** ${d.branch === "" ? "none" : `\`${d.branch}\``}`,
    `**PR:** ${d.pr === null ? "none" : typeof d.pr === "number" ? `#${d.pr}` : d.pr}`,
    `**Verify:** ${d.verify.state === "not-run" ? "not run" : `${d.verify.state} ${d.verify.sha}`}`,
    ...(d.status === "handed-back" ? [`**Handed back:** ${d.route}: ${d.reason.replace(/\n/g, " ")}`] : []),
    ...pin,
    ...(d.notes !== "" ? ["", ...d.notes.split("\n").slice(0, 10)] : []),
  ].join("\n");
}

/**
 * Merges `patch` over the stored progress fields and rewrites the comment; returns its URL.
 *
 * @internal
 */
export function saveProgress(issue: string, patch: Data): Promise<string> {
  return updateMarker(issue, MARKER, renderProgress, (old) => ({ ...DEFAULT, ...old, ...patch }));
}

/**
 * Merges the given fields into the Sub-issue's progress comment.
 *
 * @param args - The issue (a number in the current repo or a GitHub issue URL), then any of `--status`
 *   (`in-progress`, `pr-open`, `verify-passed`, `changes-requested` or `handed-back`), `--worker`, `--branch`,
 *   `--pr`, `--verify` (`"not-run"`, `"passed <sha7>"` or `"failed <sha7>"`) and `--notes`.
 * @returns 0 when the comment is written; 2 on a usage error, with the usage on stderr; 1 when the stored trailer
 *   does not decode or `gh` fails, with the reason on stderr.
 * @example
 * ```bash
 * spp progress 265 --status pr-open --pr 270 --verify "passed abc1234"
 * ```
 */
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
