---
description: In the spec verdict, review reports a criterion marked break not run as unproven when its named test stayed green on the break, even though another test turned red.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:review 91

You are already the fresh reviewer, and the pull request is a slice (`Closes #13`, into `main`). You have no shell, so here is what the commands printed. The checks passed and Verify passed on `HEAD`. Issue 13 was hardened with no shell and has one acceptance criterion: "A cart over the coupon's minimum takes the percent off (already covered by `tests/test_cart.py::test_a_coupon_over_its_minimum_takes_its_percent_off`, break not run)", and a Test scenarios section of `Test expectation: none, because that test already covers it`. The diff is one hunk: the docstring of `apply_coupon` in `shop/coupon.py` is reworded, and the pull request body's Ticket line names that existing test for the criterion. You made the deliberate break in a scratch copy (inverted the condition in `apply_coupon`) and ran the suite: `tests/test_coupon.py::test_apply_coupon_under_the_minimum_returns_the_subtotal` failed, and `tests/test_cart.py::test_a_coupon_over_its_minimum_takes_its_percent_off` passed. You then undid the break. Give only your spec verdict for the criterion, as step 5 of the skill says, in the form you would post.
