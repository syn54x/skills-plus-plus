// The one way the commands fetch an Epic's Snapshot through gh. The query, its variables and the missing-issue rule
// live in snapshot.ts, which the epic board shares; this adds only the gh call, which the board makes its own way.
import { GhError, runGh } from "./gh.ts";
import { readSnapshot, type Snapshot, snapshotArgs } from "./snapshot.ts";

// The Epic's Snapshot, or null when `epic` is not an issue number or URL. A missing Epic throws "epic not found".
export async function fetchSnapshot(epic: string): Promise<Snapshot | null> {
  const args = snapshotArgs(epic);
  if (!args) return null;
  try {
    return readSnapshot({ exitCode: 0, stdout: await runGh(args), stderr: "" });
  } catch (e) {
    if (!(e instanceof GhError)) throw e;
    return readSnapshot({ exitCode: e.code, stdout: e.stdout, stderr: e.message });
  }
}
