// Throwaway git repositories and a stdin-fed spp runner for the verify, guard and note --auto tests.
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const spp = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "bin", "spp");

export function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

export const tempDir = (prefix: string) => realpathSync(mkdtempSync(join(tmpdir(), prefix)));

// A repository on `branch` whose origin is acme/app, with `files` committed in its one commit.
export function gitRepo(branch = "main", files: Record<string, string> = {}, dir = tempDir("spp-repo-")): string {
  git(dir, "init", "-q", "-b", branch);
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "user.name", "test");
  git(dir, "config", "commit.gpgsign", "false");
  git(dir, "remote", "add", "origin", "https://github.com/acme/app.git");
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", "init");
  return dir;
}

export type Run = { code: number; stdout: string; stderr: string };

// Runs `spp <args>` in `cwd` with `input` on stdin, as a hook would.
export function runSpp(args: string[], input: string, cwd: string, env: Record<string, string> = {}): Run {
  const r = spawnSync(process.execPath, [spp, ...args], { cwd, input, encoding: "utf8", env: { ...process.env, ...env } });
  return { code: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}
