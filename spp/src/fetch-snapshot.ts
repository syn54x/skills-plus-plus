// The one way the commands fetch an Epic's Snapshot through gh. The queries, their variables, which repos get asked
// for pull requests and the missing-issue rule live in snapshot.ts, which the epic board shares; this adds only the
// gh calls, which the board makes its own way.
import { GhError, runGh } from "./gh.ts";
import { fixRepos, type Pr, pullRequestsArgs, readPullRequests, readSnapshot, type Snapshot, snapshotArgs, withPullRequests } from "./snapshot.ts";

async function gh<T>(args: string[], read: (r: { exitCode: number | null; stdout: string; stderr: string }) => T): Promise<T> {
  try {
    return read({ exitCode: 0, stdout: await runGh(args), stderr: "" });
  } catch (e) {
    if (!(e instanceof GhError)) throw e;
    return read({ exitCode: e.code, stdout: e.stdout, stderr: e.message });
  }
}

// gh's answer when the repo is not there or not readable by the gh user: a mistyped plan entry, or a private repo,
// which GraphQL answers "Could not resolve" rather than 403. Only these are skipped; a rate limit (a 403 too), a 5xx or
// a lost network would hide a fix from spp next, so each fails the command as the snapshot request does.
const UNREADABLE = /could not resolve|not found|\b404\b/i;
const warned = new Set<string>(); // once per process: spp wait polls for hours

// One repo's pull requests, or none with a warning on stderr when the repo cannot be read; any other failure throws.
async function pullRequests(repo: string, args: string[]): Promise<Pr[]> {
  try {
    return await gh(args, readPullRequests);
  } catch (e) {
    const message = (e as Error).message.split("\n")[0];
    if (!UNREADABLE.test(message)) throw e;
    if (!warned.has(repo)) process.stderr.write(`warning: pull requests of ${repo} not read: ${message}\n`);
    warned.add(repo);
    return [];
  }
}

// The Epic's Snapshot, or null when `epic` is not an issue number or URL. A missing Epic throws "epic not found".
// The pull requests into the integration branch follow, one request per repo of the Epic (ADR 0011).
export async function fetchSnapshot(epic: string): Promise<Snapshot | null> {
  const args = snapshotArgs(epic);
  if (!args) return null;
  const snapshot = await gh(args, readSnapshot);
  const repos = fixRepos(snapshot); // pairs with the argument lists by index
  return withPullRequests(snapshot, await Promise.all(pullRequestsArgs(snapshot).map((a, i) => pullRequests(repos[i], a))));
}
