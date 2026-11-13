---
type: llm
focus: last_message
---

The only acceptance criterion is marked as already covered by `tests/test_cart.py::test_a_coupon_over_its_minimum_takes_its_percent_off`, a test that is green before and after, so no test goes red on revert by design. The criterion is held by that named test.

PASS if the spec verdict passes, or raises no gap against that criterion (no Missing, Extra or Misunderstood finding about it lacking a test that goes red if the change is reverted).

FAIL if the reply reports that criterion as Missing, unproven or not backed by a test that goes red on revert.
