---
type: llm
focus: last_message
---

The project holds `tests/test_coupon.py::test_an_expired_coupon_gives_no_discount`, which calls `apply_coupon` directly, and `tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged`, which drives the same expired-coupon case through `cart_total`, the interface callers use.

PASS if the reply reports `test_an_expired_coupon_gives_no_discount` (in `test_coupon.py`) as the test to remove, names `test_an_expired_coupon_leaves_the_total_unchanged` (in `test_cart.py`) as its Keeper, and gives the opportunity a Strength (`Strong`, `Worth exploring` or `Speculative`).

FAIL if the reply proposes removing the `test_cart.py` test, names no Keeper, or claims a break was run to prove the Keeper.
