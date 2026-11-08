/**
 * `spp signal <category> --by "<skill> [step]" --evidence "<text>" [--maker-version <v>]` records one Signal, a
 * correction only judgment can see, in the repo's Signal log beside the notes log. The Signal is charged to the skill
 * step named by `--by` and to the plugin version in `--maker-version`, or to the current plugin version without it.
 * It records nothing under `CI`, outside an Attended session, or when the Routing block's Self-improvement mode is Off,
 * and says why. The repo is the current checkout's origin. It has no `--json`.
 *
 * @module
 */
import { flagPairs, guarded, UsageError } from "../markers.ts";
import { recordSignal, SIGNAL_CATEGORIES, type SignalCategory } from "../signals.ts";

export { SIGNAL_CATEGORIES, type SignalCategory } from "../signals.ts";

/** The usage text `spp signal --help` prints. */
export const USAGE = `usage: spp signal <category> --by "<skill> [step]" --evidence "<text>" [--maker-version <v>]
<category> is one of: ${SIGNAL_CATEGORIES.join(", ")}.
--maker-version is the plugin version of the step that made the corrected artifact; the current version when absent.
`;

/**
 * Records one Signal for the current repo.
 *
 * @param args - The category, then `--by` with the skill and an optional step, `--evidence` with what showed the
 *   correction, and optionally `--maker-version`.
 * @returns 0 when the Signal is recorded, printing `recorded <category> <skill> <step> <fingerprint>`, and 0 when it
 *   is not, printing `not recorded: <reason>`; 2 on a usage error, with the usage on stderr; 1 when it should be
 *   recorded but cannot be (the checkout has no GitHub origin, or the log cannot be written), with
 *   `spp signal: <reason>` on stderr.
 * @example
 * ```bash
 * spp signal step-unclear --by "harden 3" --evidence "Verify named a missing script"
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "signal", USAGE, async () => {
    const [category, ...rest] = args;
    if (!(SIGNAL_CATEGORIES as readonly string[]).includes(category)) throw new UsageError(category ? `unknown category ${category}` : "");
    const flags = new Map(flagPairs(rest, ["--by", "--evidence", "--maker-version"]));
    const [skill = "", ...step] = (flags.get("--by") ?? "").trim().split(/\s+/);
    const evidence = flags.get("--evidence") ?? "";
    if (!skill || !evidence.trim()) throw new UsageError("--by and --evidence are required");
    const version = flags.get("--maker-version");
    const r = recordSignal({ category: category as SignalCategory, skill, step: step.join(" "), evidence, ...(version && { version }) });
    if ("failed" in r) {
      process.stderr.write(`spp signal: ${r.failed}\n`);
      return 1;
    }
    if ("skipped" in r) process.stdout.write(`not recorded: ${r.skipped}\n`);
    else process.stdout.write(`recorded ${r.signal.category} ${r.signal.skill} ${r.signal.step} ${r.signal.fingerprint}\n`);
  });
}
