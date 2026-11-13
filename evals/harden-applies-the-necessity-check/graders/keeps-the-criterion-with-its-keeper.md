---
type: llm
focus: last_message
---

The plan proposed a scenario that an expired coupon leaves the total unchanged. `tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged` already drives `cart_total` with an expired coupon and asserts the total, so it is the Keeper for that scenario.

PASS if the reply has no Test scenario line for the expired coupon, and an acceptance criterion about the expired coupon ends by naming `tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged` as already covering it (for example "already covered by `tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged`", with or without a note that the break was not run).

FAIL if the reply keeps a Test scenario line for the expired coupon, drops the expired-coupon criterion, or does not name that test.
