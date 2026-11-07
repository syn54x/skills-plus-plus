// The one way the commands fetch an Epic's Snapshot through gh. The query, its variables and the missing-issue rule
// live in snapshot.ts, which the epic board shares; this adds only the gh calls, which the board makes its own way.
import { GhError, runGh } from "./gh.ts";
import { pullRequestsArgs, readPullRequests, readSnapshot, type Snapshot, snapshotArgs } from "./snapshot.ts";

async function gh<T>(args: string[], read: (r: { exitCode: number | null; stdout: string; stderr: string }) => T): Promise<T> {
  try {
    return read({ exitCode: 0, stdout: await runGh(args), stderr: "" });
  } catch (e) {
    if (!(e instanceof GhError)) throw e;
    return read({ exitCode: e.code, stdout: e.stdout, stderr: e.message });
  }
}

// The Epic's Snapshot, or null when `epic` is not an issue number or URL. A missing Epic throws "epic not found".
// With an integration branch recorded, the pull requests into it follow, one request per repo the plan names
// (ADR 0011); without one there are none to ask for.
export async function fetchSnapshot(epic: string): Promise<Snapshot | null> {
  const args = snapshotArgs(epic);
  if (!args) return null;
  const snapshot = await gh(args, readSnapshot);
  const branch = snapshot.plan?.branch;
  if (typeof branch !== "string" || !branch) return snapshot;
  const planned = Array.isArray(snapshot.plan?.repos) ? snapshot.plan.repos.filter((r): r is string => typeof r === "string") : [];
  const repos = [...new Set([snapshot.epic.repo, ...planned])];
  for (const repo of repos) snapshot.pullRequests.push(...(await gh(pullRequestsArgs(repo, branch), readPullRequests)));
  return snapshot;
}
