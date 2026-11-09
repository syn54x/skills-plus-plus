import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const gh = join(dirname(fileURLToPath(import.meta.url)), "stubs", "gh");

describe("stub stdin", () => {
  // PR #390 CI: the stub read stdin once, so a pipe still empty when it started threw EAGAIN.
  test("the gh stub reads input the parent writes to its pipe only after a delay", async () => {
    const dir = mkdtempSync(join(tmpdir(), "spp-stub-"));
    writeFileSync(join(dir, "gh.json"), "{}");
    const writes = join(dir, "writes.jsonl");
    const child = spawn(process.execPath, [gh, "issue", "create", "-R", "acme/app"], {
      cwd: dir,
      env: { ...process.env, SPP_CASE: dir, SPP_WRITES: writes },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    const code = new Promise<number | null>((done) => child.on("close", done));
    await new Promise((r) => setTimeout(r, 300));
    child.stdin.write("late ");
    await new Promise((r) => setTimeout(r, 100));
    child.stdin.end("input");
    assert.equal(await code, 0, stderr);
    assert.equal((JSON.parse(readFileSync(writes, "utf8")) as { input: string }).input, "late input");
  });
});
