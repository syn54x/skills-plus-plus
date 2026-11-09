// The spp CLI test seam. runCase runs `bin/spp <command> <args>` with stub gh and claude first on the PATH;
// the stubs answer from the case directory and log every gh write they are asked to make.
//
// A case directory holds:
//   args                    the arguments after the command, one per line
//   gh.json                 { "<gh argv joined by spaces>": { "stdout"?: string | JSON, "stderr"?: string, "code"?: number } }
//   agents.json             the same shape, answering the claude stub (optional)
//                           an answer may be a list: the nth call with that key gets the nth entry, the last repeating;
//                           a key ending in " *" answers any argv that starts with the rest
//   expected.json           the JSON stdout assertCase compares (optional)
//   expected.txt            the text stdout assertCase compares (optional)
//   expected-writes.jsonl   one { "cmd": "gh" | "claude", "argv": [...], "input"?: string } per write, in order (absent means none);
//                           every claude call but `claude agents` counts as a write
//
// Keys and logged argv are stable: a `query=` argument becomes `query=<operation name>`, and a `k=@file`,
// `--body-file file` or `--input file` argument has the file's contents inlined.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, readSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const stubs = join(root, "spp", "test", "stubs");

export type CaseResult = { code: number; stdout: string; stderr: string; json: unknown; writes: unknown[] };

const read = (dir: string, name: string) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : undefined);
const jsonl = (text = "") => text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as unknown);

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function runCase(command: string, caseDir: string): Promise<CaseResult> {
  const args = (read(caseDir, "args") ?? "").split("\n").filter(Boolean);
  const writes = join(mkdtempSync(join(tmpdir(), "spp-case-")), "writes.jsonl");
  const r = spawnSync(process.execPath, [join(root, "bin", "spp"), command, ...args], {
    cwd: caseDir,
    encoding: "utf8",
    env: { ...process.env, PATH: `${stubs}${delimiter}${process.env.PATH}`, SPP_CASE: caseDir, SPP_WRITES: writes },
  });
  return { code: r.status ?? -1, stdout: r.stdout, stderr: r.stderr, json: parse(r.stdout), writes: jsonl(read(dirname(writes), "writes.jsonl")) };
}

// Runs a case and compares its exit code, stdout and writes with the case's expected files.
export async function assertCase(command: string, caseDir: string, code = 0): Promise<CaseResult> {
  const r = await runCase(command, caseDir);
  assert.equal(r.code, code, r.stderr);
  const json = read(caseDir, "expected.json");
  if (json !== undefined) assert.deepEqual(r.json, JSON.parse(json));
  const text = read(caseDir, "expected.txt");
  if (text !== undefined) assert.equal(r.stdout, text);
  assert.deepEqual(versionless(r.writes), jsonl(read(caseDir, "expected-writes.jsonl")));
  return r;
}

// The writes with the plugin version in each trailer's makers (`by`, `verifyPinBy`) replaced by `<version>`, so a
// release that bumps package.json leaves expected-writes.jsonl as it is.
export function versionless(writes: unknown[]): unknown[] {
  const trailer = (b64: string) => {
    let data: Record<string, { version?: unknown } | null | undefined>;
    try {
      data = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    } catch {
      return b64; // a trailer spp did not write (an upsert's verbatim body) is compared as it is
    }
    const makers = ["by", "verifyPinBy"].filter((k) => typeof data?.[k]?.version === "string");
    if (!makers.length) return b64;
    for (const k of makers) data[k]!.version = "<version>";
    return Buffer.from(JSON.stringify(data)).toString("base64");
  };
  const arg = (a: unknown) => (typeof a === "string" ? a.replace(/(<!-- sdd-data: )([A-Za-z0-9+/=]+)( -->)/g, (_, open, b64, close) => open + trailer(b64) + close) : a);
  return (writes as { argv?: unknown[] }[]).map((w) => (w.argv ? { ...w, argv: w.argv.map(arg) } : w));
}

// Inlines file arguments so keys and the write log never carry a temp path.
function stableArgs(argv: string[], cwd: string): string[] {
  const file = (p: string) => readFileSync(resolve(cwd, p), "utf8"); // an absolute path (a temp file) is read as it is
  return argv.map((arg, i) => {
    if (argv[i - 1] === "--body-file" || (argv[i - 1] === "--input" && arg !== "-")) return file(arg);
    const at = /^([\w.-]+)=@(.+)$/.exec(arg);
    return at && at[2] !== "-" ? `${at[1]}=${file(at[2])}` : arg;
  });
}

const READ_VERBS = new Set(["view", "list", "status", "diff", "checks"]);

function isGhWrite(argv: string[]): boolean {
  const [cmd, sub] = argv;
  if (cmd === "--version") return false;
  if (cmd !== "api") return !READ_VERBS.has(sub);
  if (sub === "graphql") return argv.some((a) => /^query=\s*mutation\b/.test(a));
  const m = argv.findIndex((a) => a === "-X" || a === "--method");
  const method = m >= 0 ? argv[m + 1] : argv.some((a) => /^(-[fF]|--field|--raw-field|--input)$/.test(a)) ? "POST" : "GET";
  return method.toUpperCase() !== "GET";
}

type Answer = { stdout?: unknown; stderr?: string; code?: number };

// A list answer is served in call order: each call appends one byte to a per-key counter file beside the write log.
function sequence(name: string, key: string, answer: Answer | Answer[] | undefined): Answer | undefined {
  if (!Array.isArray(answer)) return answer;
  const counter = join(dirname(process.env.SPP_WRITES ?? tmpdir()), `calls-${createHash("sha1").update(name + " " + key).digest("hex")}`);
  appendFileSync(counter, "x");
  return answer[Math.min(readFileSync(counter).length, answer.length) - 1];
}

// Everything on stdin up to EOF. The parent may end the pipe only after the stub starts, and an empty non-blocking
// pipe throws EAGAIN, so that waits a moment and reads again instead of failing.
export function readStdin(): string {
  const chunks: Buffer[] = [];
  const buf = Buffer.alloc(1 << 16);
  for (;;) {
    let n: number;
    try {
      n = readSync(0, buf, 0, buf.length, null);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EAGAIN") throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
      continue;
    }
    if (n === 0) return Buffer.concat(chunks).toString("utf8");
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
}

// The body of spp/test/stubs/gh and spp/test/stubs/claude.
export function stub(name: "gh" | "claude"): void {
  const dir = process.env.SPP_CASE;
  if (!dir) throw new Error(`stub ${name}: SPP_CASE unset`);
  const argv = stableArgs(process.argv.slice(2), process.cwd());
  const keyArgs = argv.map((a) => a.replace(/^query=\s*(?:query|mutation)\s+(\w+)[\s\S]*$/, "query=$1"));
  const key = keyArgs.join(" ");
  const input = process.stdin.isTTY ? "" : readStdin();
  const write = name === "gh" ? isGhWrite(argv) : argv[0] !== "agents";
  if (write) appendFileSync(process.env.SPP_WRITES ?? "/dev/null", JSON.stringify({ cmd: name, argv: keyArgs, ...(input && { input }) }) + "\n");
  const answers = JSON.parse(read(dir, name === "gh" ? "gh.json" : "agents.json") ?? "{}") as Record<string, Answer | Answer[]>;
  // A key ending in " *" answers any argv that starts with the rest, for argv that carries a temp path.
  const prefix = Object.keys(answers).find((k) => k.endsWith(" *") && key.startsWith(k.slice(0, -1)));
  const answer = sequence(name, key, answers[key] ?? (prefix && answers[prefix]));
  if (!answer) {
    if (write) return;
    process.stderr.write(`stub ${name}: no answer for: ${key}\n`);
    process.exitCode = 1;
    return;
  }
  if (answer.stdout !== undefined) process.stdout.write(typeof answer.stdout === "string" ? answer.stdout : JSON.stringify(answer.stdout));
  if (answer.stderr) process.stderr.write(answer.stderr);
  process.exitCode = answer.code ?? 0;
}
