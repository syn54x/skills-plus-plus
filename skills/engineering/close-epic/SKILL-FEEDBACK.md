# Skill feedback

How a **[skill]** learning becomes an issue on `syn54x/skills-plus-plus`, and what it may contain. The rules exist so that nothing about the user's code, repo or organisation leaves their GitHub without their explicit, per-issue approval.

## Consent

| Condition | Result |
|---|---|
| Routing block has no `Upstream feedback` line, or says `off` | skip step 5 entirely; say so in one line |
| `Upstream feedback: on`, interactive session | preview each body; user approves / edits / skips each one |
| `Upstream feedback: on`, non-interactive (Actions, headless) | never file; write drafts under `<!-- sdd-feedback-draft -->` on the epic |
| repo is private (`gh repo view --json isPrivate`) | confirmation mandatory; drafts by default when nobody can confirm |
| `--dry-run` | print the bodies and stop |

Filing happens under the user's own `gh` login and the issue is public. Say both things at confirmation. `--web` (`gh issue create --web`) lets the user file from the browser instead, or not at all.

## What may leave (allowlist)

The body is generated from this template and nothing else. Every field is either from a closed set, a number, or the one sentence the user types.

```markdown
<!-- sdd-feedback/1 -->
**Skill:** to-tickets SDD §1
**Category:** verify-block-wrong
**Observed:** 2 of 6 tickets needed their Verify block corrected; 1 fix round was caused by it.
**Retro counts:** tickets 6 (S2 M3 L1, 2 repos) · needs-info 1 · ready-for-human 1 · blocked 0 · edges added 1 · fix rounds 3/2 PRs/max 2 · verify corrections 2 · panel C0 I2 M3 dropped 4
**Harness:** claude-code 2.1.280 · gh 2.98.0
**User note:** <one sentence the user typed, or omitted>
**Proposed change:** <one of: tighten the rule / add a check / add an example / remove the step / unclear>
```

**Observed** is composed from counts and category text only; it never quotes a ticket.

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
| `escalated-to-human` | a ticket went to `ready-for-human` |
| `panel-false-positive` | a panel finding the human dismissed |
| `panel-missed` | a defect found after merge that the panel should have caught |
| `hook-misfire` | a verify gate or worktree guard blocked or passed wrongly |
| `dispatch-failed` | a harness-specific dispatch instruction did not work |
| `docs-unclear` | the skill text was ambiguous at the step named |
| `other` | with the user's sentence |

## What may never leave (the guard)

Before filing, check the body. Any hit **blocks** the filing; the guard never rewrites:

1. Any URL (`https?://`).
2. The repo name, the org/owner name, or any `owner/repo` string from the epic or its tickets.
3. Any path that exists in the checkout (`git ls-files` match, or a token containing `/` that resolves to a file).
4. A fenced code block, or a line that looks like code (`;`, `{`, `=>`, `def `, `func `, `import `).
5. Ticket or PR titles: any line from a sub-issue title longer than three words appearing verbatim.
6. Commit messages, error text, stack traces: any line containing `Error`, `Traceback`, `at ` + path, or `exit code`.

`scripts/feedback-guard.sh <body-file>` in this skill's base directory runs these checks and exits 2 on a hit, naming the rule. Without the script, run them by eye against the list above before every filing.

## Filing

```bash
gh issue create -R syn54x/skills-plus-plus --label skill-feedback \
  --title "to-tickets SDD §1: verify-block-wrong (2/6 tickets)" \
  --body-file /tmp/feedback-1.md
# or, to file from the browser:
gh issue create -R syn54x/skills-plus-plus --label skill-feedback --title "…" --body-file /tmp/feedback-1.md --web
```

Title format: `<skill> §<step>: <category> (<count>)`. No repo names in titles either.

## Drafts

When nobody can confirm, each body goes on the epic as its own comment starting with `<!-- sdd-feedback-draft -->`. To file later:

```bash
gh api "repos/$REPO/issues/$EPIC/comments" --paginate --jq '.[] | select(.body | startswith("<!-- sdd-feedback-draft -->")) | .body' > /tmp/drafts.md
# review, then file each with the command above; delete the draft comment afterwards
```

Drafts are the user's to file or discard; nothing else reads them.
