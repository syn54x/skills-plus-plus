---
type: llm
focus: last_message
---

`tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged` already covers the plan's scenario that an expired coupon leaves the total unchanged, so the contract the reply writes has no line for it under its own `## Test scenarios` section.

Read only that section of the contract the reply writes. Ignore the plan's list of proposed scenarios and the reply's prose, even where the reply quotes them or explains the choice.

PASS if no Test scenario line in the contract is about an expired coupon.

FAIL if a Test scenario line in the contract tests an expired coupon.
