# Skill feedback

How a `[skill]` learning becomes a public issue on `syn54x/skills-plus-plus`. The issue leaves the person's GitHub under their own name, so the body is built only from fields known to be safe, checked before it goes, and filed only once they approve it.

## The profile

The Routing block in the repo's `CLAUDE.md` or `AGENTS.md` may carry an `Upstream feedback:` line. Its value picks how much an issue may say:

| Value | The issue carries |
| --- | --- |
| no line, `off`, or anything unrecognised | nothing: skip feedback and say so in one line |
| `counts` | the base fields below, and nothing in prose beyond the person's one sentence |
| `detailed` | the base fields, with **Observed** written as a few sentences on how the step failed |
| `attributed` | the `detailed` fields, plus the person's own repo name and links to this Epic, its Sub-issues and their pull requests |

## Who decides

- **A person in the run.** Show each complete body, then ask: file it, edit it, or skip it. Before the first one, say that the issue is public and is filed under their GitHub account. `--web` on the filing command lets them file from the browser instead.
- **Nobody can answer.** A run where no person can reply before it ends (a CI job, a scheduled task, an unattended worker) files nothing. Write every body into the drafts comment (below) and stop.
- **A private repo** (`gh repo view --json isPrivate` says `true`) always needs a person; with none, use drafts. Under `attributed`, the question names the repo and says that its name and the linked Epic, Sub-issues and pull requests become visible to anyone.

An earlier approval, an approval in a file, or one given for a different body does not count.

## The body

Build the body from this template and nothing else. Each field is a number, a value from a closed list, or text the person typed.

```markdown
<!-- spp-feedback/1 -->
**Skill:** harden step 3
**Category:** verify-block-wrong
**Observed:** 2 of 7 Sub-issues needed their Verify block rewritten; it caused 1 fix round.
**Retro counts:** Sub-issues 7 · fix rounds 3 · by cause: told 4, not told 1, untagged 0 · hand-backs 1 · panel 2 rounds, 5 findings · ponytail did not run
**Harness:** <harness name and version> · gh <version>
**Proposed change:** add a check
**Eval case:** the fix lands with an eval case that reproduces this defect, red before the fix and green after it.
**Person's note:** <one sentence they typed, or leave the line out>
```

- **Observed** under `counts` is built from counts and the category; it quotes nothing. Under `detailed` and `attributed`, write a few sentences in your own words at the level of the skill's steps: what the step said, what the agent did with it, what the person then fixed by hand.
- **Retro counts** come from `spp retro`. `by cause` gives only the told, not told and untagged totals from close-epic step 2; the keys themselves are file paths and section names, so they stay in the local retro. A number the retro reported as not found is written `not found`.
- **Proposed change** is one of: `tighten the step`, `add a check`, `add an example`, `drop the step`, `unclear`.
- **Eval case** is in every body, unchanged.
- Under `attributed`, add after **Observed**: `**Repo:** <owner/repo>` from `gh repo view --json nameWithOwner`, and `**Links:**` with the full URLs of this Epic, its Sub-issues and their pull requests, and no other URL.

### Categories

| Category | The retro or session shows |
| --- | --- |
| `verify-block-wrong` | a Verify block that could not run as written |
| `contract-gap` | a Sub-issue reached `ready-for-agent` with a section missing or a placeholder in it |
| `missed-edge` | a blocked-by edge added mid-build that the plan should have had |
| `undeclared-deviation` | a Produces or Consumes signature changed without an **Interface deviation** line |
| `brief-gap` | a worker stopped with `NEEDS_CONTEXT` or `BLOCKED` for a fact the brief should have carried |
| `fix-round` | a gate verdict failed and sent the worker back |
| `law-told` | fix-round findings citing a Law the worker had (the told total) |
| `law-not-told` | fix-round findings citing a repo file outside the Laws line (the not-told total) |
| `human-needed` | a Sub-issue went to `ready-for-human` |
| `panel-false-positive` | a panel finding the person dismissed |
| `panel-miss` | a defect found after the merge that the panel should have caught |
| `hook-wrong` | a hook blocked or passed when it should not have |
| `driver-failed` | starting or waking a worker failed |
| `step-unclear` | the step could be read two ways and the agent took the wrong one |
| `other` | none of these; the person's note says what |

## The outbound check

Before filing or drafting, read the finished body against each rule. One hit stops that issue; fix the body by rebuilding it from the template, never by deleting the offending words.

1. **URLs.** None, except under `attributed`, where an issue or pull request URL inside the person's own repo passes.
2. **Names.** No owner, org or repo name, and no `owner/repo` string, from this Epic or its Sub-issues. Under `attributed`, the person's own `owner/repo` and the bare repo name pass; the bare owner name still does not.
3. **Paths.** No token that is a file or directory in the checkout (`git ls-files` finds it).
4. **Code.** No fenced block and no line that reads as code (`;`, `{`, `=>`, `import `, `def `, `func `).
5. **Titles.** No run of four or more words copied from a Sub-issue or pull request title.
6. **Error text.** No commit message, stack trace, or line containing `Error`, `Traceback` or `exit code`.

## Filing

The title is `<skill> <step>: <category> (<the number that shows it>)`, for example `harden step 3: verify-block-wrong (2/7 Sub-issues)`. Under `attributed` it may end with ` in <repo>`, the bare repo name; no other profile names a repo in the title.

```bash
gh issue create -R syn54x/skills-plus-plus --label skill-feedback --title "$TITLE" --body-file "$BODY_FILE"
```

Add `--web` when the person would rather file from the browser.

## The drafts comment

When nobody can approve, every body goes into one comment on the Epic, and each run rewrites that comment whole, so the file always holds every draft. Each draft is a `## Draft <n>: <title>` heading followed by its body in a four-backtick fence, which keeps any fence inside the body from closing it.

`````markdown
<!-- sdd-feedback-draft -->
## Draft 1: harden step 3: verify-block-wrong (2/7 Sub-issues)

````markdown
<the body, as the template built it>
````
`````

```bash
spp upsert "$EPIC" '<!-- sdd-feedback-draft -->' "$DRAFTS_FILE"
```

The drafts belong to the person, and nothing else reads them. To file one, they copy its body into a file, read it, run the outbound check, and file it with the command above under the draft's title. Re-running `/close-epic` does not file them, because the summary comment now exists and the gate stops it. Once every draft is filed or dropped, they delete the drafts comment.
