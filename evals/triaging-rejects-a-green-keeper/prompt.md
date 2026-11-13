---
description: A pruning issue whose Keeper stays green under the break ends as wontfix with the test kept, and no worker, harden call or test removal follows.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Use triaging for #71 in acme/shop. There is no shell in this session, so the issue's text is the file `issue.md` in this project, and the output of the commands is given here. `spp kind 71` prints `raw`. The repo has the five state labels. There is no `.out-of-scope/` and no `SCOPE.md`, and no other issue asks for this. In a scratch copy of the default branch, outside this checkout, the Keeper passed first. Then the issue's Break was made in `shop/coupon.py`, and `python -m pytest "tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged"` printed `1 passed in 0.01s` and exited 0. Reach the outcome and stop where triaging waits for the person.
