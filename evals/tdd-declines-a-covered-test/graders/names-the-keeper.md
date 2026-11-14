---
type: llm
focus: last_message
---

`apply_coupon` in `shop/coupon.py` has one caller, `cart_total` in `shop/cart.py`. The test `test_an_expired_coupon_leaves_the_total_unchanged` in `tests/test_cart.py` drives `cart_total` with an expired coupon and asserts a hand-worked total, so it already fails if `apply_coupon` starts discounting an expired coupon. A unit test of `apply_coupon` for the same case would replay a case that test already owns.

PASS if all of these hold:
- The reply declines to write the requested test of `apply_coupon`.
- It names `test_an_expired_coupon_leaves_the_total_unchanged` (in `tests/test_cart.py`) as the test that already catches that break.
- It says why: breaking the expiry check in `apply_coupon` would turn that existing test red.

FAIL if the reply writes the new test, shows its code as something to add, proposes adding it anyway, or does not name `test_an_expired_coupon_leaves_the_total_unchanged`.
