---
description: In the spec verdict, review does not report a criterion marked as already covered as Missing for lacking a test that goes red on revert.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:review 90

You are already the fresh reviewer, and the pull request is a slice (`Closes #12`, into `main`). You have no shell and the checks have passed, so here is all there is. Issue 12 has one acceptance criterion: "A cart over the coupon's minimum takes the percent off (already covered by `tests/test_cart.py::test_a_coupon_over_its_minimum_takes_its_percent_off`)", and a Test scenarios section of `Test expectation: none, because that test already covers it`. The diff is one hunk: the docstring of `apply_coupon` in `shop/coupon.py` is reworded, and the pull request body's Ticket line for the criterion names that existing test. Verify passed on `HEAD`. The test is green on the base commit and stays green, so reverting the change turns nothing red. Give only your spec verdict for the criterion, as step 5 of the skill says, in the form you would post.
