---
type: llm
focus: last_message
---

Issue 71 asks to remove `test_a_percent_coupon_takes_its_share_off`, naming `test_an_expired_coupon_leaves_the_total_unchanged` as its Keeper. With the issue's break made in a scratch copy, the Keeper still passed (`1 passed`), because its coupon is expired and never reaches the percent branch. The finding was wrong. The triaging skill's `PRUNING.md` says what the outcome and its comment hold: `wontfix` with no record in `.out-of-scope/`, because a wrong finding is not a rejected idea.

PASS if all of these hold:
- The outcome for #71 is `wontfix`, because the Keeper stayed green under the break.
- The comment it shows or describes holds the break made, the Keeper command and its green output, and says `test_a_percent_coupon_takes_its_share_off` stays.
- The reply says no record is written to `.out-of-scope/` (or that none is needed), since the finding was wrong and nothing was rejected.
- The reply may ask the person to confirm, since triage waits for their word.

FAIL if the outcome is `ready-for-agent` or any role other than `wontfix`, if the reply plans a call to `harden`, if it proposes removing any test, if it plans to write or extend an `.out-of-scope/` record, or if the comment omits the break, the command or the green output.
