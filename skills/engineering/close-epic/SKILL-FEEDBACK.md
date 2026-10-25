# Skill feedback

How a **[skill]** learning becomes an issue on `syn54x/skills-plus-plus`, and what it may contain. The rules exist so that nothing about the user's code, repo or organisation leaves their GitHub without their explicit, per-issue approval.

## Consent

| Condition | Result |
|---|---|
The routing block's `Upstream feedback:` line names a **profile**. A line that still says `on` is read as `counts`.

| Condition | Result |
|---|---|
| Routing block has no `Upstream feedback` line, or says `off` | skip step 5 entirely; say so in one line |
| `Upstream feedback: counts` (or a legacy `on`) | the counts template; all six guard rules |
| `Upstream feedback: detailed` | the detailed template; all six guard rules, unchanged |
| `Upstream feedback: attributed` | the attributed template; rules 1 and 2 relaxed for the user's own repo only, rules 3 to 6 unchanged |
| any profile but `off`, interactive session | preview each body; user approves / edits / skips each one |
| any profile but `off`, non-interactive (Actions, headless) | never file; write every draft into one `<!-- sdd-feedback-draft -->` comment on the epic |
| repo is private (`gh repo view --json isPrivate`) | confirmation mandatory; drafts by default when nobody can confirm. Under `attributed`, the confirmation names the repo and says that its name and the epic, ticket and PR links become public |
| `--dry-run` | print the bodies and stop |

Filing happens under the user's own `gh` login and the issue is public. Say both things at confirmation. `--web` (`gh issue create --web`) lets the user file from the browser instead, or not at all.

## What may leave (allowlist)

The body is generated from the profile's template and nothing else. Under `counts`, every field is either from a closed set, a number, or the one sentence the user types.

### `counts`

```markdown
<!-- sdd-feedback/1 -->
**Skill:** to-tickets SDD §1
**Category:** verify-block-wrong
**Observed:** 2 of 6 tickets needed their Verify block corrected; 1 fix round was caused by it.
**Retro counts:** tickets 6 (S2 M3 L1, 2 repos) · needs-info 1 · ready-for-human 1 · blocked 0 · edges added 1 · fix rounds 3/2 PRs/max 2 · by cause: repo 3 · epic 1 · ticket 1 · cited 0 · skill 1 · none 2 · verify corrections 2 · panel C0 I2 M3 dropped 4
**Harness:** claude-code 2.1.280 · gh 2.98.0
**User note:** <one sentence the user typed, or omitted>
**Proposed change:** <one of: tighten the rule / add a check / add an example / remove the step / unclear>
```

**Observed** is composed from counts and category text only; it never quotes a ticket.

**by cause** sums `fix_rounds.by_cause` into its six families, by name only: `repo` adds every repo-path and `ADR-nnnn` key, `ticket` adds every `ticket#…` key, and `epic`, `cited`, `skill` and `none` copy their own key (0 when absent). The keys themselves are paths and section names, so they stay in the local retro. With `by_cause` `null`, write `by cause: not found`.

### `detailed`

The `counts` template, with **Observed** as several sentences that describe the mechanism: what the skill said, what the agent did, what the user had to do by hand. Write it in your own words, at the level of the skill's steps. It names no repo, URL, path, ticket or PR title, code or error text; the guard checks all six rules as for `counts`.

```markdown
**Observed:** The step told the agent to copy the test command from the epic. The agent copied it as written, and the command named a runner the repo does not use. The user rewrote the Verify block by hand on 2 of 6 tickets before workers could run it.
**Retro counts:** tickets 6 (S2 M3 L1, 2 repos) · … · fix rounds 3/2 PRs/max 2 · by cause: repo 3 · epic 1 · ticket 1 · cited 0 · skill 1 · none 2 · …
```

### `attributed`

The `detailed` template, plus two lines after **Observed**. `<owner/repo>` is the user's own repo (`gh repo view --json nameWithOwner`). Each link is a full `https://github.com/<owner/repo>/issues/<n>` or `/pull/<n>` URL to the epic, one of its sub-issues, or one of their PRs, and nothing else.

```markdown
**Repo:** <owner/repo>
**Links:** epic <url> · tickets <url>, <url> · PRs <url>, <url>
**Retro counts:** tickets 6 (S2 M3 L1, 2 repos) · … · fix rounds 3/2 PRs/max 2 · by cause: repo 3 · epic 1 · ticket 1 · cited 0 · skill 1 · none 2 · …
```

### Categories (closed set)

| Category | Means |
|---|---|
| `verify-block-wrong` | a ticket's Verify block could not run as written |
| `placeholder-passed-gate` | a ticket reached `ready-for-agent` with a placeholder or missing section |
| `edge-missed` | the safety check or plan missed a dependency; an edge was added mid-build |
| `interface-drift` | a Produces/Consumes signature differed between tickets |
| `cross-repo-not-available` | a consumer was dispatched before its producer was reachable |
| `brief-incomplete` | a worker reported `NEEDS_CONTEXT` or `BLOCKED` for something the brief should have carried |
| `fix-round-needed` | a reviewer verdict failed and the worker needed a fix round |
| `law-read-not-checked` | the count of fix-round findings whose **Law** the worker was given (a repo path on the Laws line or fallback list, `epic`, `ticket`, `cited`, `skill`), from `close-epic` §4's cross-check |
| `law-not-in-read-list` | the count of fix-round findings citing a repo path on neither the Laws line nor the fallback list, from the same cross-check |
| `escalated-to-human` | a ticket went to `ready-for-human` |
| `panel-false-positive` | a panel finding the human dismissed |
| `panel-missed` | a defect found after merge that the panel should have caught |
| `hook-misfire` | a verify gate or worktree guard blocked or passed wrongly |
| `dispatch-failed` | a harness-specific dispatch instruction did not work |
| `docs-unclear` | the skill text was ambiguous at the step named |
| `other` | with the user's sentence |

## What may never leave (the guard)

Before filing, check the body. Any hit **blocks** the filing; the guard never rewrites:

1. Any URL (`https?://`). Under `attributed`, an issue or PR link into the user's own repo passes; any other URL, including another path in the own repo, still blocks.
2. The repo name, the org/owner name, or any `owner/repo` string from the epic or its tickets. Under `attributed`, the own repo's `owner/repo` and its bare repo name pass; any other repo's name, and the bare owner name, still block.
3. Any path that exists in the checkout (`git ls-files` match, or a token containing `/` that resolves to a file).
4. A fenced code block, or a line that looks like code (`;`, `{`, `=>`, `def `, `func `, `import `).
5. Ticket or PR titles: any line from a sub-issue title longer than three words appearing verbatim.
6. Commit messages, error text, stack traces: any line containing `Error`, `Traceback`, `at ` + path, or `exit code`.

`scripts/feedback-guard.sh <body-file> --profile <profile>` in this skill's base directory runs these checks and exits 2 on a hit, naming the rule; under `attributed` add `--own <owner/repo>`. It exits 1 under `off`. `scripts/feedback-guard-check.sh` runs its fixture cases for every profile. Without the script, run them by eye against the list above before every filing.

## Filing

```bash
gh issue create -R syn54x/skills-plus-plus --label skill-feedback \
  --title "to-tickets SDD §1: verify-block-wrong (2/6 tickets)" \
  --body-file /tmp/feedback-1.md
# or, to file from the browser:
gh issue create -R syn54x/skills-plus-plus --label skill-feedback --title "…" --body-file /tmp/feedback-1.md --web
```

Title format: `<skill> §<step>: <category> (<count>)`. Under `attributed` the title may end with ` in <repo>` (the repo name only, never the owner or a link); under every other profile, no repo names in titles either.

## Drafts

When nobody can confirm, every body goes into **one** comment on the epic, written with `sync-progress.sh upsert <epic> '<!-- sdd-feedback-draft -->' <drafts-file>`. `upsert` rewrites the comment in place, so the file always carries every draft, never only the newest. Each draft is one section: a `## Draft <n>: <title>` heading, then the body in a four-backtick fenced block, so a body's own fences cannot close it early.

`````markdown
<!-- sdd-feedback-draft -->
## Draft 1: to-tickets §1: verify-block-wrong (2/6 tickets)

````markdown
<the body, exactly as the template built it>
````

## Draft 2: …
`````

To file later, one section at a time:

```bash
gh api "repos/$REPO/issues/$EPIC/comments" --paginate --jq '.[] | select(.body | startswith("<!-- sdd-feedback-draft -->")) | .body' > /tmp/drafts.md
N=1   # the draft to file
awk -v n="$N" '$0 ~ "^## Draft " n ":" {f=1; next} f && /^````/ {if (b) exit; b=1; next} f && b' /tmp/drafts.md > "/tmp/feedback-$N.md"
# review, run the guard, then file it with the command above, using the section's title
# once every draft is filed or discarded, delete the draft comment
```

Drafts are the user's to file or discard; nothing else reads them.
