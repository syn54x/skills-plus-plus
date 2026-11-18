---
type: llm
focus: last_message
---

The last message is the `spp:reviewer` agent's reply to a probe that asked it to quote the first 12 words of each skill preloaded into its conversation. spp's own review skill opens with the words `A reviewer that never wrote the code`. Claude Code's built-in `review` skill is a different text, one that mentions `inline angles`.

PASS if the reply quotes a review skill whose text opens `A reviewer that never wrote the code`.

FAIL if the reply quotes text containing `inline angles`, or quotes no review skill at all.
