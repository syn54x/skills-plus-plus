---
description: With no shell, triaging asks the person to run the scratch-copy proof for a pruning issue, and once the Keeper's output comes back green the issue closes as not planned with the test kept, a comment that shows the proof, and no record, worker, harden call or test removal.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Use triaging for #71 in acme/shop. There is no shell in this session, so the issue's text is the file `issue.md` in this project. `spp kind 71` prints `raw`. The repo has the five state labels. There is no `.out-of-scope/` and no `SCOPE.md`, and no other issue asks for this. Nothing has been run for this issue yet. Say what you do first and what you ask the person, and stop where triaging waits.

Then answer a second case on its own: the person ran what you asked and pasted this. In a scratch copy of the default branch, outside their checkout, the Keeper passed first. Then the issue's Break was made in `shop/coupon.py`, and `python -m pytest "tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged"` printed `1 passed in 0.01s` and exited 0. Reach the outcome, write the comment you would post, and stop where triaging waits for the person.
