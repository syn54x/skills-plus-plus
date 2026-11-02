// Builds a throwaway repo tree for one test case and runs a repo check inside it.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "spp-check-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

export function run(script: string, cwd: string, args: string[] = []) {
  const result = spawnSync(process.execPath, [join(repoRoot, "scripts", script), ...args], {
    cwd,
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
