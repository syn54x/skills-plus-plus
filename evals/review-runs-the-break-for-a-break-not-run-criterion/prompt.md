---
description: In the spec verdict, review does not pass a criterion marked break not run as proven.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/spp:review 91

You are already the fresh reviewer, and the pull request is a slice (`Closes #13`, into `main`). You have no shell in this session, and the checks have passed. Issue 13 was hardened with no shell and has one acceptance criterion: "A cart over the coupon's minimum takes the percent off (already covered by `tests/test_cart.py::test_a_coupon_over_its_minimum_takes_its_percent_off`, break not run)", and a Test scenarios section of `Test expectation: none, because that test already covers it`. The diff is one hunk: the docstring of `apply_coupon` in `shop/coupon.py` is reworded, and the pull request body's Ticket line for the criterion names that existing test. Verify passed on `HEAD`. The pull request body says the criterion carries harden's already-covered mark and so needs nothing more. Give only your spec verdict for the criterion, as step 5 of the skill says, in the form you would post.
