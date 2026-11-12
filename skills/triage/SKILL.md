---
name: triage
description: Move a filed bug or enhancement to one triage role, hardened and sized when it is ready to build.
disable-model-invocation: true
---

Triage the issue the person named after `/triage`: its number or its URL. Every triage step lives in `triaging`; this skill only picks the issue and hands it on.

## 1. Pick

With an issue named, go to step 2.

With no issue named, find what is waiting on the person. An open issue waits in two cases, and no other is listed:

- It holds no Triage role or `needs-triage`, its body has no `## Verify` heading, and it has no **Marker comment** (a comment whose first line starts `<!-- sdd-`). Either of those means it is already past triage.
- It holds `needs-info`, and once Marker comments are set aside, its newest comment is not a triage note (a comment that opens with the disclaimer line [`triaging`](../triaging/SKILL.md) posts, read from that file). That comment is the reporter's reply, whatever the body holds.

Fetch the candidates, then show the person a table of number, title, days waiting and the reason it is there, longest wait first, and let them pick one:

```bash
gh issue list --state open --limit 200 --json number,title,body,labels,createdAt,comments
```

## 2. Hand it on

Call the Skill tool with "delegating" for `triaging` #<N>, where N is the issue picked or named, and follow it to the end of the run. Do nothing else here: `delegating` chooses where the triage runs, and every triage step lives in `triaging`.
