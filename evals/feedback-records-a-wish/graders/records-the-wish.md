---
type: llm
focus: last_message
---

The person wished harden checked that every Verify command exists before it pins the block, and asked for the command that would record it.

PASS if all three of these hold:
- The command is `spp signal wish`.
- `--by` names harden alone, with no step (`--by "harden"`).
- `--evidence` quotes the person's wish word for word: "I wish harden checked that every Verify command exists before it pins the block".

FAIL if the reply gives a different command, omits `--by` or `--evidence`, charges another skill or a step, or paraphrases the wish.
