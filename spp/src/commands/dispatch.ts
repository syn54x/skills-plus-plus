// spp dispatch <N> --driver bg|desktop|subagent: starts one worker on a ticket that nobody holds.
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGh } from "../gh.ts";
import { flagPairs, guarded, parseIssue, UsageError } from "../markers.ts";
import { run as brief } from "./brief.ts";
import { saveProgress } from "./progress.ts";

export const USAGE = `usage: spp dispatch <issue number | issue URL> --driver bg|desktop|subagent
Refuses a ticket that is held (the claimed label or an assignee). bg writes the brief, starts
claude --bg --worktree sdd-<N> --name t-<N> on it and records t-<N> as the worker; desktop and subagent
write the brief and print its path, because those drivers are harness tools the skill calls itself.
`;

const DRIVERS = ["bg", "desktop", "subagent"];

export function run(args: string[]): Promise<number> {
  return guarded(() => "dispatch", USAGE, async () => {
    const [arg, ...rest] = args;
    const driver = flagPairs(rest, ["--driver"]).find(([f]) => f === "--driver")?.[1];
    if (arg === undefined || !driver || !DRIVERS.includes(driver)) throw new UsageError(driver ? `unknown driver ${driver}` : "");
    const issue = parseIssue(arg);

    type View = { url: string; labels: { name: string }[]; assignees: { login: string }[] };
    const view = JSON.parse(await runGh(["issue", "view", issue.arg, "--json", "url,labels,assignees"])) as View;
    const holders = [...view.labels.filter((l) => l.name === "claimed").map(() => "the claimed label"), ...view.assignees.map((a) => a.login)];
    if (holders.length) {
      process.stderr.write(`spp dispatch: ${issue.label} is held (${holders.join(", ")}); not starting a second worker\n`);
      return 1;
    }
    if (driver !== "bg") return brief([issue.arg]);

    const file = join(mkdtempSync(join(tmpdir(), "spp-dispatch-")), `brief-${issue.number}.md`);
    const code = await brief([issue.arg, "--out", file]);
    if (code) return code;
    const name = `t-${issue.number}`;
    const prompt = `Your full brief is the file ${file}. Read it completely before anything else, then run the implement-issue skill for ${view.url} and follow it.`;
    const r = spawnSync("claude", ["--bg", "--worktree", `sdd-${issue.number}`, "--name", name, prompt], { encoding: "utf8" });
    if (r.status !== 0) {
      process.stderr.write(`spp dispatch: claude --bg failed: ${(r.stderr || r.error?.message || `exit ${r.status}`).trim()}\n`);
      return 1;
    }
    await saveProgress(issue.arg, { worker: name });
    process.stdout.write(`started ${name}${r.stdout.trim() ? ` (${r.stdout.trim()})` : ""}\n`);
  });
}
