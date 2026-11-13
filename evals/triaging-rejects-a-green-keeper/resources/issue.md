# 71: Remove redundant test: test_a_percent_coupon_takes_its_share_off

Labels: needs-triage. No comments.

## Pruning opportunity

- Remove: `tests/test_coupon.py::test_a_percent_coupon_takes_its_share_off`
- Keeper: `tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged`
- Owning code: `shop/coupon.py::apply_coupon`
- Break: `apply_coupon` takes nothing off for a coupon that has not expired and returns the subtotal unchanged.
- Strength: `Speculative`

The Keeper was named by reading. No break was run.

## Why it is redundant

The test replays through `apply_coupon` a case that `cart_total` owns, and the cart test reaches `apply_coupon` on every call.
