/**
 * `spp brief <issue> [--out FILE]` writes the worker brief for one Sub-issue and prints the file's path. The brief
 * holds the ticket body verbatim, the Laws sources from the Routing block, the branch mechanics (the ticket's pushed
 * branch brought onto the base, or a new one cut from the Epic's integration branch, or from the default branch for a
 * One-off), the worker's name `t-<N>` and the report format (one fenced JSON object). Without `--out` the file goes in
 * a new temporary directory. It has no `--json`.
 *
 * @module
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGh } from "../gh.ts";
import { find, flagPairs, guarded, parseIssue, readTrailer, UsageError } from "../markers.ts";
import { readRouting } from "../routing.ts";
import { slug } from "./branch.ts";

/** The usage text `spp brief --help` prints. */
export const USAGE = `usage: spp brief <issue number | issue URL> [--out FILE]
Writes the worker brief for the ticket (its body verbatim, the Laws sources, the branch mechanics, the report format)
and prints the file's path. Without --out the file is a new one in the temp directory.
`;

type Issue = { number: number; title: string; url: string; body: string; state: string; parent: { url: string } | null };

// The branch the ticket's PR targets: its Epic's integration branch, else the repo's default branch (a One-off).
async function baseBranch(issue: Issue): Promise<string> {
  if (!issue.parent) {
    const repo = /github\.com\/([^/]+\/[^/]+)\/issues\//.exec(issue.url)![1];
    return (await runGh(["repo", "view", repo, "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"])).trim();
  }
  const epic = parseIssue(issue.parent.url);
  const branch = readTrailer((await find(epic, "<!-- sdd-plan -->"))?.body ?? "")?.branch;
  if (typeof branch !== "string" || branch === "") throw new Error(`epic ${epic.label}'s plan comment names no integration branch; run spp branch ${epic.number}`);
  return branch;
}

function render(issue: Issue, base: string, laws: string[], checkout: string): string {
  const n = issue.number;
  const branch = `sdd/${n}-${slug(issue.title)}`;
  const repo = /github\.com\/([^/]+\/[^/]+)\/issues\//.exec(issue.url)![1];
  // A closed ticket's own branch has merged (squashed, so a rebase would replay it): a fix worker never takes it.
  const closed = issue.state === "CLOSED";
  const ask = closed
    ? `pushed=2  # #${n} is closed: its own branch merged, so never take it`
    : `pushed=0; git ls-remote --exit-code --heads origin ${branch} >/dev/null || pushed=$?`;
  return `You are t-${n}, implementing ${issue.url}${issue.parent ? ` of the epic ${issue.parent.url}` : ""}.
Start in the checkout at ${checkout}; the ticket, its branch and its PR all live in ${repo} and nowhere else.
First, before anything else, whatever branch this worktree started on, take your branch: ${closed ? "" : `the pushed \`${branch}\` when origin has it (an earlier worker on this ticket pushed it, so you continue its work), rebased onto the remote ${issue.parent ? "integration" : "base"} branch when it is behind; else `}a new one cut from ${closed ? `the remote ${issue.parent ? "integration" : "base"} branch, since #${n} is closed and its own branch has merged` : "that branch"}. Either way its base is confirmed. Run it as one command:

    (
      set -e
      git fetch origin ${base}
      ${ask}
      if [ "$pushed" = 0 ]; then
        git fetch origin ${branch}
        git switch -c ${branch} origin/${branch}
        git merge-base --is-ancestor origin/${base} HEAD || git rebase origin/${base} || { git rebase --abort; exit 1; }
      elif [ "$pushed" = 2 ]; then
        git switch -c ${branch} origin/${base}
      else
        echo "cannot ask origin for ${branch}" >&2; exit 1
      fi
      test "$(git merge-base HEAD origin/${base})" = "$(git rev-parse origin/${base})"
    )

If it fails (a fetch that fails, an origin it cannot ask, a rebase that conflicts), stop and report BLOCKED; write no code on a branch with any other base. When it rebased a pushed branch, push with \`git push --force-with-lease\`.
Then run the implement-issue skill for ${issue.url} and follow it. This brief is the context that skill assumes.

## Ticket (verbatim)

${issue.body.endsWith("\n") ? issue.body : issue.body + "\n"}
## Laws

Read these yourself; they bind this slice.

${laws.map((l) => `- ${l}`).join("\n")}
${issue.parent ? `- the epic ${issue.parent.url}: the Implementation Decisions that bind this slice, and the plan comment's Constraints line\n` : ""}
## Mechanics

- Branch \`${branch}\`, taken from origin or cut from \`origin/${base}\` by the first step above; open the PR into \`${base}\` with \`Closes #${n}\` on its first line. Do not merge.
- Claim #${n} with \`spp claim ${n}\` and write t-${n} on the Worker line of the progress comment (\`spp progress ${n} --worker t-${n}\`). The build starts you with an Agent description that begins t-${n}, and the Epic board finds you by it.
- Progress is one comment on #${n}, rewritten in place through \`spp progress\`; never post a second one.
- Commit as you go with conventional messages. The last commit before the PR is the one Verify ran on.
- Write the PR body to a file unique to this ticket (for example \`$(mktemp -t pr-${n})\`), never a shared path.

## Report

End with one fenced JSON object and nothing after it, the report implement-issue's last step defines, because the build that started you reads it:

\`\`\`json
{ "ticket": ${n}, "pr": "<pull request URL>", "verifySha": "<sha7>", "status": "DONE", "notes": "..." }
\`\`\`

\`status\` is DONE, DONE_WITH_CONCERNS, BLOCKED or NEEDS_CONTEXT. \`pr\` and \`verifySha\` are null when no pull request opened. \`notes\`, in 200 words or fewer, holds the commits, the TDD evidence (the RED and GREEN commands with their output) and anything the reviewer must know; for BLOCKED or NEEDS_CONTEXT, exactly what you are stuck on, what you tried, and what would unblock you. Then stop.
`;
}

/**
 * Writes the worker brief and prints its path.
 *
 * @param args - The Sub-issue (an issue number in the current repo or an issue URL), then `--out FILE` to choose
 *   the file.
 * @returns 0 when the brief is written; 2 on a usage error, with the usage on stderr; 1 with the reason on stderr
 *   when there is no Routing block, the Epic's plan comment names no integration branch, or `gh` fails.
 * @example
 * ```bash
 * spp brief 265 --out /tmp/brief-265.md
 * ```
 */
export function run(args: string[]): Promise<number> {
  return guarded(() => "brief", USAGE, async () => {
    const [arg, ...rest] = args;
    if (arg === undefined) throw new UsageError("");
    const target = parseIssue(arg);
    const out = flagPairs(rest, ["--out"]).find(([f]) => f === "--out")?.[1];
    const found = readRouting(process.cwd());
    if (!found) throw new Error("no Routing block in CLAUDE.md or AGENTS.md; run /setup-spp");
    const issue = JSON.parse(await runGh(["issue", "view", target.arg, "--json", "number,title,url,body,parent,state"])) as Issue;
    const file = out ?? join(mkdtempSync(join(tmpdir(), "spp-brief-")), `brief-${issue.number}.md`);
    writeFileSync(file, render(issue, await baseBranch(issue), found.routing.laws, process.cwd()));
    process.stdout.write(file + "\n");
  });
}
