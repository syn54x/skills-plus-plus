/**
 * `spp checks <pr | sha> [--json]` reads CI for a pull request (its checks), or for a commit given as 7 to 40 hex
 * characters (its check runs). It prints the result, followed by the failing or pending run names. The reading comes
 * from each run's bucket, never from `gh`'s exit code: pending is never a pass, a cancelled run counts as a failure,
 * and runs that all skip read as `none`. With `--json` it prints {@link Checks}.
 *
 * @module
 */
import { GhError, runGh } from "../gh.ts";

/** The usage text `spp checks --help` prints. */
export const USAGE = "usage: spp checks <pr number | pr URL | commit sha> [--json]\n";

/** One CI run. */
export type CheckRun = {
  /** The run's name. */
  name: string;
  /** `pass`, `fail`, `pending`, `skipping` or `cancel`, as `gh pr checks` buckets it. */
  bucket: string;
};
/** CI's reading: the `--json` shape of `spp checks`. */
export type Checks = {
  /** `fail` when any run failed or was cancelled, else `pending` when any has not passed, else `pass`; `none` when no run counts (skipped runs never do). */
  result: "pass" | "fail" | "pending" | "none";
  /** Every run, skipped ones included. */
  runs: CheckRun[];
};

// A commit check run's status and conclusion as the bucket gh pr checks would give it.
function bucket(status: string, conclusion: string | null): string {
  if (status !== "completed") return "pending";
  if (conclusion === "success") return "pass";
  if (conclusion === "skipped" || conclusion === "neutral") return "skipping";
  if (conclusion === "cancelled") return "cancel";
  return conclusion === "stale" ? "pending" : "fail";
}

// cancel counts as fail; skipping is not counted, so runs that all skip read as none.
function result(runs: CheckRun[]): Checks["result"] {
  const counted = runs.map((r) => r.bucket).filter((b) => b !== "skipping");
  if (counted.some((b) => b === "fail" || b === "cancel")) return "fail";
  if (counted.some((b) => b !== "pass")) return "pending";
  return counted.length ? "pass" : "none";
}

async function prRuns(pr: string): Promise<CheckRun[]> {
  let out: string;
  try {
    out = await runGh(["pr", "checks", pr, "--json", "name,bucket"]);
  } catch (e) {
    // gh exits non-zero for failing or pending checks but still prints them; with none at all it prints nothing.
    if (!(e instanceof GhError)) throw e;
    if (e.stdout.trim()) out = e.stdout;
    else if (/no checks reported/.test(e.message)) return [];
    else throw e;
  }
  return (JSON.parse(out) as CheckRun[]).map(({ name, bucket }) => ({ name, bucket }));
}

// shortcut: a commit's check runs only, not its legacy commit statuses; add those if a repo's CI still posts them.
async function commitRuns(sha: string): Promise<CheckRun[]> {
  const out = await runGh(["api", `repos/{owner}/{repo}/commits/${sha}/check-runs`, "--paginate", "--jq", ".check_runs[] | [.name, .status, .conclusion] | @json"]);
  return out.split("\n").filter(Boolean).map((l) => {
    const [name, status, conclusion] = JSON.parse(l) as [string, string, string | null];
    return { name, bucket: bucket(status, conclusion) };
  });
}

/**
 * A pull request is a number or a URL; anything else of 7 to 40 hex characters is a commit.
 *
 * @internal
 */
export async function readChecks(target: string): Promise<Checks> {
  const runs = /^[0-9a-f]{7,40}$/i.test(target) && !/^\d+$/.test(target) ? await commitRuns(target) : await prRuns(target);
  return { result: result(runs), runs };
}

/**
 * The runs behind a fail or pending result, by name: the failing ones, else the pending ones.
 *
 * @internal
 */
export function culprits(c: Checks): string[] {
  const hit = (b: string) => (c.result === "fail" ? b === "fail" || b === "cancel" : c.result === "pending" && b === "pending");
  return c.runs.filter((r) => hit(r.bucket)).map((r) => r.name);
}

/**
 * Prints CI's reading for a pull request or a commit.
 *
 * @param args - A pull request number or URL, or a commit sha, and `--json` for the {@link Checks} shape.
 * @returns 0 whatever the reading (read it from the output); 2 on a usage error, with the usage on stderr. A `gh`
 *   error exits 1 with the reason on stderr.
 * @example
 * ```bash
 * spp checks 264
 * spp checks 6aa253f --json
 * ```
 */
export async function run(args: string[]): Promise<number> {
  const rest = args.filter((a) => a !== "--json");
  if (rest.length !== 1) {
    process.stderr.write(USAGE);
    return 2;
  }
  const c = await readChecks(rest[0]);
  const text = c.result === "fail" || c.result === "pending" ? `${c.result}: ${culprits(c).join(", ")}` : c.result;
  process.stdout.write(args.includes("--json") ? JSON.stringify(c, null, 2) + "\n" : text + "\n");
  return 0;
}
