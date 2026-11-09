// The one place spp shells out to gh.
import { spawn, spawnSync } from "node:child_process";

// A non-zero gh exit. The message is gh's stderr; stdout is kept because gh still prints a GraphQL response
// when the response carries errors.
export class GhError extends Error {
  code: number | null;
  stdout: string;
  constructor(message: string, code: number | null, stdout: string) {
    super(message);
    this.code = code;
    this.stdout = stdout;
  }
}

// runGh for a synchronous caller (the Attended check); it throws the same GhError.
export function runGhSync(args: string[]): string {
  const r = spawnSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (r.error) throw new GhError(`gh: ${r.error.message}`, null, "");
  if (r.status !== 0) throw new GhError(r.stderr.trim() || `gh exited ${r.status}`, r.status, r.stdout);
  return r.stdout;
}

export function runGh(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    child.stdin.on("error", () => {}); // gh may exit without reading its input; its exit code reports why
    child.on("error", (e) => reject(new GhError(`gh: ${e.message}`, null, "")));
    child.on("close", (code) => (code === 0 ? resolve(stdout) : reject(new GhError(stderr.trim() || `gh exited ${code}`, code, stdout))));
    child.stdin.end(input);
  });
}
