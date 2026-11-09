# Skill feedback

The route from a Signal or a `[skill]` learning to a public issue on `syn54x/skills-plus-plus`. Each skill step and category gets one grouped Skill feedback issue, filed through `spp feedback file`, and every repo that sees the same defect adds its own tally comment to it. The issue and the tally leave the person's GitHub under their own name, so spp builds both from fields known to be safe and checks them before they go.

## Modes

The repo's **Self-improvement mode** is the `Self-improvement mode:` line of the Routing block (in the repo's `CLAUDE.md` or `AGENTS.md`). It sets the most a report may say:

| Mode | What is collected and filed |
| --- | --- |
| Off (no line, or anything unrecognised) | Nothing is collected and nothing is filed. |
| Anonymous | Signal and run counts per plugin version, and a note with no project detail. The six rules of the outbound check block. |
| Full Detail | The Anonymous fields, plus the repo's name and each Signal's evidence. The six rules only warn. |

An old `Upstream feedback:` line still works: `off` reads as Off, `counts` and `detailed` as Anonymous, `attributed` as Full Detail.

The person's **Submission mode** is set for each repo with `spp feedback submission [Auto|Review]`, run in a checkout of that repo:

| Mode | What happens at a checkpoint |
| --- | --- |
| Review (unset) | Each preview is shown whole, and the person answers file, skip or later. |
| Auto | spp files each candidate unattended, and the issue and tally say so. |

Auto falls back to Review in a private repo. A **Multi-repo epic** takes the Self-improvement mode of its most private repo, so a report says no more than the strictest repo allows.

## Who decides

- **Review.** The person decides each candidate at a checkpoint, on the exact preview `spp feedback file` printed. An earlier approval, an approval written in a file, or one given for a different preview does not count; the `--confirm` hash ties the yes to that text.
- **Auto.** spp decides, and files without asking.

A run that is not an **Attended session** (CI, a `claude -p` script, a scheduled task) collects no Signals, so it has nothing to offer or file.

## The checkpoint

`spp feedback checkpoint` lists the pending candidates and prints the steps for each: file it, show its preview, skip it or leave it for later. When nothing is pending, or the run is not collecting, it prints nothing. It runs at:

- the end of a Wave in `/build`;
- the end of a `/build` run (a One-off's hand-over, or an Epic's last Wave end);
- close-epic step 5;
- the start of a new session, through the plugin's `SessionStart` hook.

Never in the middle of a step (a gate, a fix round, a merge), and never from a worker.

## The body

spp builds the issue body and the tally comment from the `spp-feedback/2` template; nobody writes them by hand. The body names the skill step, the category, the counts, the Proposed change and the fingerprint the issue groups. The tally holds this repo's Signals and runs per plugin version, and under Full Detail the repo and each Signal's evidence.

- `--change` is the Proposed change: one of `add a check`, `tighten the step`, `add an example`, `drop the step` or `unclear` (the default).
- `--note` is the person's note on the tally. Under Anonymous it is one sentence with no project detail. Under Full Detail it may describe the failure step by step: what the step told the agent, what the agent did with it, and what the person then fixed by hand.
- The **Eval case** line is in every body, unchanged: the fix lands with an eval case that reproduces the defect.

### Categories

| Category | The retro or session shows |
| --- | --- |
| `verify-unrunnable` | a Verify block that could not run as written |
| `contract-gap` | a Sub-issue was labelled `ready-for-agent` while a section was missing or held a placeholder |
| `missed-edge` | a blocked-by edge added mid-build that the plan should have had |
| `undeclared-deviation` | a Produces or Consumes signature changed without an **Interface deviation** line |
| `contract-edited` | a Ticket contract changed after `ready-for-agent`: an Interface deviation, a Spec delta, or a Verify block that no longer matches its pin |
| `brief-gap` | a worker stopped with `NEEDS_CONTEXT` or `BLOCKED` for a fact missing from its brief |
| `fix-round` | a gate verdict failed and sent the worker back |
| `fix-regression` | a panel finding in a later round fell on a line the previous fix round changed |
| `law-told` | findings in fix rounds that cite a Law the worker had (the told total) |
| `law-not-told` | findings in fix rounds that cite a repo file outside the Laws line (the not-told total) |
| `human-needed` | a Sub-issue was routed to `ready-for-human` |
| `panel-noise` | the person threw out a panel finding |
| `panel-gap` | a defect surfaced after the merge that the panel had in its scope |
| `escaped-defect` | a defect surfaced after a gated merge, recorded by `/triage` against the gate that passed it |
| `hook-wrong` | a hook blocked or passed when it should not have |
| `driver-failed` | starting or waking a worker failed |
| `step-unclear` | the step could be read two ways and the agent took the wrong one |
| `wish` | the person said they wish spp or one of its skills did something, or complained about one |
| `other` | none of these; the person's note says what |

## Blame

A Signal is charged to the direct maker of the corrected artifact: the skill step whose output someone had to fix. When drafting `--note`, the charge moves to an earlier step only with the evidence [LEARNINGS.md](LEARNINGS.md) requires for a `[skill]` tag: a count from the retro, or the moment that earlier step was followed and was wrong. The note then names that step and its evidence. Without either, the charge stays where spp put it.

## The outbound check

`spp feedback file` runs the check itself on the body and tally it builds, and `spp feedback check` runs it on a body written by hand. It reads the Self-improvement mode from the Routing block (an old `Upstream feedback:` line still counts) and applies the secrets rule and the six rules below, so a program stops a leak and not only your reading of the rules.

```bash
spp feedback check "$BODY_FILE" --title-file "$TITLE_FILE"
```

`$TITLE_FILE` holds one line per title of this Epic's Sub-issues and their pull requests, plus one `owner/repo` line for each repo the Epic, its Sub-issues or its pull requests live in. The check takes the current repo's name from `gh repo view` and the tracked paths from `git ls-files`, so run it from the repo's checkout.

| Exit | Meaning |
| --- | --- |
| 0 | Clean with no output, or warnings only (each line starts `warning: `): the body may be shown for approval, with the warnings shown to the person. |
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

```bash
spp feedback file "$FP" --epic "$EPIC" --change 'add a check' --note 'The step'\''s check ran after the edit it guards.'
```

Write `--change` and `--note` in single quotes, with each `'` inside them as `'\''`, so the shell passes the text unchanged.

It finds the open grouped issue for the fingerprint, or creates one titled `<skill> <step>: <category> (<signals>/<runs> runs)` with the `skill-feedback` label, then writes the person's own tally comment on it. Under Review it first prints the preview and `confirm: <hash>` and exits 3; the same command with `--confirm <hash>` files that text. Exit 0 ends with `filed <fingerprint> <issue URL> created|existing`. `spp feedback skip "$FP"` drops a candidate for good.
