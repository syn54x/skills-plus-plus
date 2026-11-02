// spp guard worktree: the PreToolUse hook on Bash. In a session working in a linked worktree, it denies a command
// that would write into the main checkout outside that worktree (exit 2, the reason on stderr); it allows the rest.
// It reads the command, it does not run it: `$(...)`, variables and globs are not expanded, so they never deny.
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { enterHookCwd, gitOut, readHookInput } from "./verify.ts";

const USAGE = "usage: spp guard worktree   (a PreToolUse hook on Bash: reads the hook payload on stdin)\n";

const WRITES_EVERY_OPERAND = new Set(["rm", "rmdir", "unlink", "touch", "mkdir", "mv", "tee", "truncate", "chmod", "chown"]);
const WRITES_LAST_OPERAND = new Set(["cp", "ln", "install", "rsync"]);
// git subcommands that leave the checkout's files, index and HEAD alone.
const GIT_READS = new Set(["status", "log", "show", "diff", "rev-parse", "ls-files", "merge-base", "blame", "grep", "fetch", "describe", "cat-file", "rev-list", "shortlog", "remote", "config", "branch", "tag", "notes", "worktree"]);

// The command as simple commands of words. Quotes and backslashes are honoured; `>` before a word marks it as a
// redirect target, and fd duplications (`2>&1`) are dropped.
function parse(command: string): string[][] {
  const out: string[][] = [[]];
  let word: string | null = null;
  const end = () => {
    if (word !== null) out[out.length - 1].push(word);
    word = null;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === "'") {
      const j = command.indexOf("'", i + 1);
      word = (word ?? "") + command.slice(i + 1, j < 0 ? undefined : j);
      i = j < 0 ? command.length : j;
    } else if (c === '"') {
      let s = "";
      for (i++; i < command.length && command[i] !== '"'; i++) s += command[i] === "\\" ? command[++i] ?? "" : command[i];
      word = (word ?? "") + s;
    } else if (c === "\\") word = (word ?? "") + (command[++i] ?? "");
    else if (c === ">" || c === "<") {
      if (c === ">" && word !== null && /^\d+$/.test(word)) word = null; // `2>`: the 2 is an fd, not a word
      end();
      while (command[i + 1] === ">" || command[i + 1] === "|" || command[i + 1] === "<") i++;
      if (command[i + 1] === "&") {
        for (i++; /[\d-]/.test(command[i + 1] ?? ""); i++);
        continue;
      }
      out[out.length - 1].push(c);
    } else if (";|&()\n".includes(c)) {
      end();
      if (out[out.length - 1].length) out.push([]);
    } else if (/\s/.test(c)) end();
    else word = (word ?? "") + c;
  }
  end();
  return out.filter((s) => s.length);
}

// Every path the command would write, resolved against the directory it would run in.
function writeTargets(command: string, cwd: string): string[] {
  let dir = cwd;
  const targets: string[] = [];
  for (const words of parse(command)) {
    const argv: string[] = [];
    for (let k = 0; k < words.length; k++) {
      if (words[k] === ">") words[k + 1] !== undefined && targets.push(resolve(dir, words[++k]));
      else if (words[k] === "<") k++;
      else argv.push(words[k]);
    }
    while (/^\w+=/.test(argv[0] ?? "")) argv.shift(); // FOO=1 cmd
    const [cmd, ...rest] = argv;
    const operands = rest.filter((a) => !a.startsWith("-"));
    if (cmd === "cd" || cmd === "pushd") dir = resolve(dir, operands[0] ?? homedir());
    else if (cmd === "git") {
      let here = dir;
      let k = 0;
      for (; rest[k]?.startsWith("-"); k++) {
        if (rest[k] === "-C") here = resolve(here, rest[++k] ?? "");
        else if (rest[k] === "-c") k++;
      }
      if (rest[k] !== undefined && !GIT_READS.has(rest[k])) targets.push(here);
    } else if (WRITES_EVERY_OPERAND.has(cmd)) targets.push(...operands.map((o) => resolve(dir, o)));
    else if (WRITES_LAST_OPERAND.has(cmd) && operands.length) targets.push(resolve(dir, operands[operands.length - 1]));
    else if ((cmd === "sed" || cmd === "perl") && rest.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith("--in-place")))
      targets.push(...operands.map((o) => resolve(dir, o)));
  }
  return targets;
}

// The path with symlinks resolved, for the part of it that exists (macOS tmp paths are symlinks).
function real(p: string): string {
  let head = p;
  let tail = "";
  while (!existsSync(head) && dirname(head) !== head) {
    tail = join(basename(head), tail);
    head = dirname(head);
  }
  return join(realpathSync(head), tail);
}

const inside = (p: string, root: string) => p === root || p.startsWith(root + sep);

async function worktree(): Promise<number> {
  const input = await readHookInput();
  const command = input.tool_input?.command;
  if (input.tool_name !== "Bash" || !command) return 0;
  enterHookCwd(input);
  const own = gitOut("rev-parse", "--show-toplevel");
  const gitDir = gitOut("rev-parse", "--path-format=absolute", "--git-dir");
  const common = gitOut("rev-parse", "--path-format=absolute", "--git-common-dir");
  // Not a linked worktree (the main checkout, a bare repository, no repository at all): nothing to guard.
  if (!own || !gitDir || !common || gitDir === common || basename(common) !== ".git") return 0;
  const main = real(dirname(common));
  const ownRoot = real(own);
  const hit = writeTargets(command, real(process.cwd())).map(real).find((t) => inside(t, main) && !inside(t, ownRoot));
  if (!hit) return 0;
  process.stderr.write(`spp guard: this command writes to ${hit}, inside the main checkout ${main}, but this session works in the worktree ${ownRoot}. Make the change inside the worktree.\n`);
  return 2;
}

export async function run(args: string[]): Promise<number> {
  if (args.length === 1 && args[0] === "worktree") return worktree();
  process.stderr.write(USAGE);
  return 2;
}
