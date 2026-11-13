---
type: llm
focus: last_message
---

The merged percent scenario now owns the percent behaviour at `cart_total`, and `tests/test_coupon.py::test_a_percent_coupon_takes_its_share_off` covers the same behaviour one layer down.

PASS if all of these hold: the merged percent scenario line ends with `; replaces` followed by `tests/test_coupon.py::test_a_percent_coupon_takes_its_share_off` in backticks; Files owned lists `tests/test_coupon.py` as a `Test:` entry; an acceptance criterion says that `tests/test_coupon.py::test_a_percent_coupon_takes_its_share_off` no longer exists; Verify has a command that fails while that test's name is still in `tests/test_coupon.py`; and the reply names no other test for removal.

FAIL if the replaced test is not named on the scenario line, `tests/test_coupon.py` is missing from Files owned, there is no criterion or no Verify command for its removal, or the reply proposes removing any other test (for instance `test_an_expired_coupon_leaves_the_total_unchanged`).
