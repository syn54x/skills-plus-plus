# Ponytail beside the gate

`ponytail-review` is a **Friend**: a review skill the ponytail plugin ships. It tends to catch runtime and edge defects on write paths that no Test scenario named, and it is weak on spec and Laws, which is why it sits beside review and never replaces it. Its own verdict (ship, or fix first) is never read: only its findings, and only those that survive your check.

## When it runs

Both hold, or skip this file:

- `ponytail-review` is among the skills you can call. When it is not, review runs unchanged and says nothing about it.
- The diff changes code: source or tests. A pull request of prose, docs or config alone gets nothing from it.

## Steps

1. **Draft first.** Finish steps 5 and 6 and save the draft comment. Your own findings are fixed before ponytail's arrive, so its list cannot reshape yours.
2. **Run it.** Call the Skill tool with "ponytail-review" on the same pull request at `HEAD`, in the same checkout. Tell it the review is not to be posted; keep its findings list.
3. **Split.** A ponytail finding on the same file as one of yours, within 5 lines, is overlap: drop it, yours already covers it. The rest are unique.
4. **Verify each unique finding.** Read the line, follow the path it describes, and reproduce the failure when a command can show it. Keep it only when it passes the 80% confidence rule as if you had found it yourself, at the severity you would give it. Drop the rest without comment.
5. **Promote.** A kept Critical or Important finding fails the quality verdict, as one of yours would, and joins the fix round. List it only in the Ponytail comment below, never in the Quality section, which carries one line instead: `Promoted from ponytail: <n>, listed in the Ponytail comment.` The retro measures overlap between the two lists, so a finding written in both counts twice.
6. **Post the Ponytail comment** after the review comment, with `gh pr comment "$PR" --body-file <file>`:

```markdown
## Ponytail
- <Critical|Important|Minor> · <file:line> · <title>
```

One line per kept finding. When none survived, the comment is the heading and `No finding stood after verification.`, so the retro still sees that ponytail ran.

Done when every unique ponytail finding is kept or dropped, and the Ponytail comment is on the pull request.
