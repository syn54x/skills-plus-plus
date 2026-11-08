# Skill feedback

The route from a `[skill]` learning to a public issue filed against `syn54x/skills-plus-plus`. The issue leaves the person's GitHub under their own name, so its body is assembled only from fields known to be safe, checked before it goes, and filed only once they approve it.

## Profiles

An `Upstream feedback:` line in the Routing block (in the repo's `CLAUDE.md` or `AGENTS.md`) picks how much an issue may say:

| Value | The issue carries |
| --- | --- |
| no line, `off`, or anything unrecognised | nothing: skip feedback and report the skip |
| `counts` | the base fields below, with no prose beyond the person's one sentence |
| `detailed` | the base fields, with **Observed** written as a few sentences on how the step failed |
| `attributed` | the `detailed` fields, plus the name of the person's repo and links to this Epic, its Sub-issues and their pull requests |

## Who decides

- **A person in the run.** Show each complete body, then ask: file it, edit it, or skip it. Before the first one, say that the issue is public and is filed under their GitHub account. `--web` on the filing command lets them file from the browser instead.
- **Nobody can answer.** A run where no person can reply before it ends (a CI job, a scheduled task, an unattended worker) files nothing. It writes every body into the drafts comment (below) and stops.
- **A private repo** (`gh repo view --json isPrivate` says `true`) always needs a person; with none, use drafts. Under `attributed`, the question spells out the repo's name and warns that the name and the linked Epic, Sub-issues and pull requests will be visible to anyone.

An earlier approval, an approval written in a file, or one given for a different body does not count.

## The body

Build the body from this template and nothing else. Each field is a number, a value from a closed list, or text the person typed.

```markdown
<!-- spp-feedback/1 -->
**Skill:** harden step 3
**Category:** verify-unrunnable
**Observed:** 2 of 7 Sub-issues needed their Verify block rewritten, which caused 1 fix round.
**Retro counts:** Sub-issues 7 · fix rounds 3 · by cause: told 4, not told 1, untagged 0 · hand-backs 1 · panel 2 rounds, 5 findings · ponytail did not run
**Harness:** <harness name and version> · gh <version>
**Proposed change:** add a check
**Eval case:** the fix lands with an eval case that reproduces this defect, red before the fix and green after it.
**Person's note:** <one sentence they typed, or leave the line out>
```

- **Observed** under `counts` is built from numbers and the category; it quotes nothing. Under `detailed` and `attributed`, describe the failure step by step: what the step told the agent, what the agent did with it, and what the person then fixed by hand.
- **Retro counts** come from `spp retro`. `by cause` gives only the told, not told and untagged totals from close-epic step 2; the keys behind them are file paths and section names, which never leave the repo. A number the retro reported as not found is written `not found`.
- **Proposed change** is one of: `add a check`, `tighten the step`, `add an example`, `drop the step`, `unclear`.
- **Eval case** is in every body, unchanged.
- Under `attributed`, add after **Observed**: `**Repo:** <owner/repo>` from `gh repo view --json nameWithOwner`, and `**Links:**` with the full URLs of this Epic, its Sub-issues and their pull requests, and no other URL.

### Categories

| Category | The retro or session shows |
| --- | --- |
| `verify-unrunnable` | a Verify block that could not run as written |
| `contract-gap` | a Sub-issue was labelled `ready-for-agent` while a section was missing or held a placeholder |
| `missed-edge` | a blocked-by edge added mid-build that the plan should have had |
| `undeclared-deviation` | a Produces or Consumes signature changed without an **Interface deviation** line |
| `brief-gap` | a worker stopped with `NEEDS_CONTEXT` or `BLOCKED` for a fact missing from its brief |
| `fix-round` | a gate verdict failed and sent the worker back |
| `law-told` | findings in fix rounds that cite a Law the worker had (the told total) |
| `law-not-told` | findings in fix rounds that cite a repo file outside the Laws line (the not-told total) |
| `human-needed` | a Sub-issue was routed to `ready-for-human` |
| `panel-noise` | the person threw out a panel finding |
| `panel-gap` | a defect surfaced after the merge that the panel had in its scope |
| `hook-wrong` | a hook blocked or passed when it should not have |
| `driver-failed` | starting or waking a worker failed |
| `step-unclear` | the step could be read two ways and the agent took the wrong one |
| `other` | none of these; the person's note says what |

## The outbound check

Before filing or drafting, run `spp feedback check` on the finished body. It reads the Self-improvement mode from the Routing block (an old `Upstream feedback:` line still counts) and applies the secrets rule and the six rules below, so a program stops a leak and not only your reading of the rules.

```bash
spp feedback check "$BODY_FILE" --title-file "$TITLE_FILE"
```

`$TITLE_FILE` holds one line per title of this Epic's Sub-issues and their pull requests, plus one `owner/repo` line for each repo the Epic, its Sub-issues or its pull requests live in. The check takes the current repo's name from `gh repo view` and the tracked paths from `git ls-files`, so run it from the repo's checkout.

| Exit | Meaning |
| --- | --- |
| 0 | Clean with no output, or warnings only (each line starts `warning: `): the body may be shown for approval or drafted, with the warnings shown to the person. |
| 2 | Blocked: one line per hit, naming the rule number, the rule name and the body's line number. |
| 1 | The mode is Off (or unset or unrecognised) and nothing may be filed, or the command was used wrongly. |

A secret blocks in every mode. Under Anonymous rules 1 to 6 block too; under Full Detail they print as warnings and do not stop the issue, so the person sees what the body says about the project. One blocking hit stops that issue. Fix the body by rebuilding it from the template, never by deleting the offending words, and run the check again; it never rewrites the body itself, and it prints every secret it finds as `[REDACTED]`. The rules:

0. **Secrets.** No token, key or private key, matched by patterns taken from gitleaks' default rules (GitHub, GitLab, AWS, Google Cloud, Slack, Anthropic, OpenAI, npm and Stripe tokens, JWTs and private-key headers). The hit names the gitleaks rule, as in `Secrets (aws-access-token)`.
1. **URLs.** None, except under Full Detail, where an issue or pull request URL inside the person's own repo passes. A URL counts with or without its scheme: `www.` hosts and `domain.tld/path` are URLs too.
2. **Names.** No owner, org or repo name, and no `owner/repo` string, from this Epic or its Sub-issues. Under Full Detail, the person's own `owner/repo` and the bare repo name pass; the bare owner name still does not. Short names count, matched as whole words in any case.
3. **Paths.** No token naming a file or directory that `git ls-files` lists, wherever it sits in the token (`path#L10`, `path@main`, `file=path`, `a/path`, an absolute path ending in it), nor a tracked file's basename that has an extension (`invoice.ts`), nor a nested directory's last segment written with a slash (`billing/`, `/billing`). Any home path (`/home/<user>/`, `/Users/<user>/`, `~/`) is out as well.
4. **Code.** No fenced block and no line that reads as code (`;`, `{`, `=>`, `import `, `def `, `func `).
5. **Titles.** No run of four or more words copied from a Sub-issue or pull request title.
6. **Error text.** No commit message (a conventional-commit subject line), stack trace (JavaScript, Java, Python, Go, Rust, or any `file:line` frame), or line containing `error`, `fatal:`, `exception`, `traceback`, `panic` or `exit code`, in any case.

The check errs toward blocking. A hit on an innocent line is cheaper than a leak, so rebuild the body from the template and run it again.

## Filing

The title is `<skill> <step>: <category> (<the number that shows it>)`, for example `harden step 3: verify-unrunnable (2/7 Sub-issues)`. Under `attributed` the title may add ` in <repo>` at the end, the bare repo name; no other profile names a repo in a title.

```bash
gh issue create --title "$TITLE" --body-file "$BODY_FILE" --label skill-feedback -R syn54x/skills-plus-plus
```

Add `--web` when the person would rather file from the browser.

## The drafts comment

When nobody can approve, the drafts all share a single comment on the Epic, and each run rewrites that comment whole, so its file always holds every draft. Each draft is a `## <n>. <title>` heading followed by its body in a four-backtick fence, which keeps any fence inside the body from closing it.

`````markdown
<!-- sdd-feedback-draft -->
## 1. harden step 3: verify-unrunnable (2/7 Sub-issues)

````markdown
<the body, as the template built it>
````
`````

```bash
spp upsert "$EPIC" '<!-- sdd-feedback-draft -->' "$DRAFT_BODIES"
```

The drafts belong to the person, and nothing else reads them. To file one, they copy its body into a file, read it, run `spp feedback check` on it, and use the filing command under the draft's title. Re-running `/close-epic` does not file them, because the summary comment now exists and the gate stops it. When none are left to file or drop, they delete the comment.
