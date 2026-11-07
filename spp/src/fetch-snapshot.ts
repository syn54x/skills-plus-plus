// The one way the commands fetch an Epic's Snapshot through gh. The queries, their variables, which repos get asked
// for pull requests and the missing-issue rule live in snapshot.ts, which the epic board shares; this adds only the
// gh calls, which the board makes its own way.
import { GhError, runGh } from "./gh.ts";
import { type Pr, pullRequestsArgs, readPullRequests, readSnapshot, type Snapshot, snapshotArgs, withPullRequests } from "./snapshot.ts";

async function gh<T>(args: string[], read: (r: { exitCode: number | null; stdout: string; stderr: string }) => T): Promise<T> {
  try {
    return read({ exitCode: 0, stdout: await runGh(args), stderr: "" });
  } catch (e) {
    if (!(e instanceof GhError)) throw e;
    return read({ exitCode: e.code, stdout: e.stdout, stderr: e.message });
  }
}

// One repo's pull requests, or none with a warning on stderr: a repo the gh user cannot read, or a mistyped plan
// entry, loses its fixes and nothing else.
async function pullRequests(args: string[]): Promise<Pr[]> {
  try {
    return await gh(args, readPullRequests);
  } catch (e) {
    const repo = args.filter((a) => /^(owner|repo)=/.test(a)).map((a) => a.slice(a.indexOf("=") + 1)).join("/");
    process.stderr.write(`warning: pull requests of ${repo} not read: ${(e as Error).message.split("\n")[0]}\n`);
    return [];
  }
}

// The Epic's Snapshot, or null when `epic` is not an issue number or URL. A missing Epic throws "epic not found".
// The pull requests into the integration branch follow, one request per repo of the Epic (ADR 0011).
export async function fetchSnapshot(epic: string): Promise<Snapshot | null> {
  const args = snapshotArgs(epic);
  if (!args) return null;
  const snapshot = await gh(args, readSnapshot);
  return withPullRequests(snapshot, await Promise.all(pullRequestsArgs(snapshot).map(pullRequests)));
}
