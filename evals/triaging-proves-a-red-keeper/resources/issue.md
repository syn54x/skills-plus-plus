# 72: Remove redundant test: test_an_expired_coupon_leaves_the_subtotal_unchanged

Labels: needs-triage. No comments.

## Pruning opportunity

- Remove: `tests/test_coupon.py::test_an_expired_coupon_leaves_the_subtotal_unchanged`
- Keeper: `tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged`
- Owning code: `shop/coupon.py::apply_coupon`
- Break: `apply_coupon` ignores the expiry date and takes the percent off an expired coupon too.
- Strength: `Worth exploring`

The Keeper was named by reading. No break was run.

## Why it is redundant

The test replays through `apply_coupon` the expired-coupon case that `cart_total` owns, and the cart test reaches `apply_coupon` on every call.
