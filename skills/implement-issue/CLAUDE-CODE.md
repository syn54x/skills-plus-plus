# implement-issue on Claude Code

The `spp` plugin puts `spp` on the Bash tool's PATH. Each capability the skill names maps to one command here; `<N>` is the issue number in the current repo, or its URL when the Epic spans repos.

## Capabilities

| Capability | Command |
| --- | --- |
| Read the issue | `gh issue view <N> --json number,title,url,body,state,labels,assignees,parent,blockedBy` and `gh issue view <N> --comments` |
| Read the base branch | the brief names it; otherwise `spp brief <N>` writes a brief that does and prints its path |
| Claim | `spp claim <N>` |
| Write the progress comment | `spp progress <N> --status <s> --worker <you> --branch <b> --pr <n> --verify "passed <sha7>"`; pass only the fields that changed, the rest keep their values |
| Post a note | `spp note <N> "<text>" --milestone`; `--milestone` also copies the line into the progress comment |
| Run Verify | `spp verify <N>`; it prints `pass:` or `fail:` per command and writes `verified <time>` or `failed <time>` as a git note on `HEAD` under `refs/notes/sdd-verify` |
| Publish the Verify record | see *Pushing the notes ref* |
| Open the pull request | `BODY=$(mktemp "${TMPDIR:-/tmp}/pr-<N>.XXXXXX")` (this form works on both BSD and GNU `mktemp`), write the body there, then `gh pr create --base <base> --title "<title>" --body-file "$BODY"` |
| Hand back | `spp hand-back <N> needs-info\|ready-for-human\|blocked --reason "<why>"`, adding `--blocked-by <issue>` on the `blocked` route when you know the blocker |
| Record a blocked stop | `git notes --ref=sdd-verify add -f -m blocked HEAD` |

Your name on the Worker line is the one your brief gives you, `t-<N>`, which is also the name your subagent was started with; a person writes their login.

## Pushing the notes ref

Every worker in a Wave pushes `refs/notes/sdd-verify`, so a push is often rejected because a sibling got there first. Merge theirs and push again, up to three pushes in all:

```bash
git push origin refs/notes/sdd-verify || for i in 1 2; do
  git fetch origin +refs/notes/sdd-verify:refs/notes/sdd-verify-remote
  git notes --ref=sdd-verify merge -s ours refs/notes/sdd-verify-remote
  git push origin refs/notes/sdd-verify && break
done
```

Notes on different commits never conflict, and `-s ours` keeps your own record if the same commit somehow carries two. If all three pushes fail, say so in the report; the pull request body carries the verified SHA as well.

## Hooks that act for you

The plugin's hooks run on their own; never call them by hand.

| Hook | What it does |
| --- | --- |
| Stop and SubagentStop: `spp verify --check` | On an `sdd/*` branch, refuses to let you stop while the tree is dirty or `HEAD` carries neither a `verified` nor a `blocked` note. The refusal names the fix. |
| PostToolUse on Bash: `spp note --auto` | Posts `PR open <url>` after a `gh pr create` that printed a URL, and `Verify passed <sha>` or `Verify failed <sha>` after `spp verify`. Do not post these two notes yourself. |
| Stop: `spp note --auto` | Posts `stopped`. |
| PreToolUse on Bash: `spp guard worktree` | Refuses a command that would write into the main checkout from a worktree session. Run every command from your own worktree. |

## Worker notes

You run as the `spp:worker` subagent, in a worktree of your own with this skill preloaded, and the brief is your first message. Its first commands cut the branch; step 3 then only confirms it.
