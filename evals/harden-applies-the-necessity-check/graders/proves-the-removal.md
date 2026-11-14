---
type: llm
focus: last_message
---

The merged percent scenario replaces `tests/test_coupon.py::test_a_percent_coupon_takes_its_share_off`, so the contract the reply writes must make the worker delete it.

PASS if both hold in the contract: an acceptance criterion says that test no longer exists, and the Verify block has a command that fails while the test's name is still in `tests/test_coupon.py`; and the reply names no other test for removal.

FAIL if the criterion or the Verify command is missing, or the reply proposes removing any other test (for instance `test_an_expired_coupon_leaves_the_total_unchanged`).
