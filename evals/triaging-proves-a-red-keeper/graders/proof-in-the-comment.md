---
type: llm
focus: last_message
---

Issue 72 asks to remove `test_an_expired_coupon_leaves_the_subtotal_unchanged`, naming `test_an_expired_coupon_leaves_the_total_unchanged` as its Keeper. With the issue's break made in a scratch copy, the Keeper failed on its own assertion (`assert 90.0 == 100`). The triaging skill's `PRUNING.md` says what a proven pruning issue's hand-off holds: after harden, the body is read again to confirm the acceptance criterion carries the plain mark naming the Keeper (`already covered by` plus the Keeper) and that the Test scenarios section is the `Test expectation: none` line; and the comment carries the proof under a `**Proof:**` line, where a bug's carries the reproduction.

PASS if all of these hold:
- The reply says it reads the hardened body again and checks the criterion's plain mark naming the Keeper and the `Test expectation: none` line.
- The triage comment it shows has a `**Proof:**` line naming the break made, the Keeper command, and the red output (the `assert 90.0 == 100` failure).
- The outcome is `ready-for-agent`.

FAIL if the comment has no `**Proof:**` line or omits the break, the command or the red output, if the reply never checks the hardened body for the mark and the no-test line, or if it proposes removing the test without going through `harden`.
