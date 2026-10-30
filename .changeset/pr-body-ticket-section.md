---
"mattpocock-skills": minor
---

`implement-issue`'s self-review now writes a `## Ticket` section into the PR body: one line per acceptance criterion and Test scenario, in the ticket's order, each naming the test or `file:line` hunk that satisfies it, with a gap closed before the PR opens rather than marked `n/a`. The claims check covers every test and hunk it names. `review-pr`'s spec verdict starts from that section, tags a line the diff does not bear out `[ticket#Acceptance criteria]` or `[ticket#Test scenarios]`, and treats a PR body with no `## Ticket` section as an Important finding tagged `[skill#PR body]`.
