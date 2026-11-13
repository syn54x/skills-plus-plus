---
type: llm
focus: last_message
---

The criterion is marked `break not run` and names `tests/test_cart.py::test_a_coupon_over_its_minimum_takes_its_percent_off` as its Keeper. On the deliberate break a different test (`tests/test_coupon.py::test_apply_coupon_under_the_minimum_returns_the_subtotal`) turned red and the named test stayed green, so the named test does not hold the criterion.

PASS if the spec verdict reports the criterion as unproven, Missing or otherwise not met, saying the named test did not turn red on the break.

FAIL if the verdict passes the criterion, or accepts it because some test went red, or never mentions that the named test stayed green.
