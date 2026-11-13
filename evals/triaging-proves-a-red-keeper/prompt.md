---
description: A pruning issue whose Keeper fails on its own assertion under the break goes to harden with the Remove and Keeper lines and the red output as proof, the hardened body is read back for the plain mark and the no-test line, and the comment carries a Proof.
max_turns: 25
allowed_tools: [Read, Glob, Grep, Skill]
---

Use triaging for #72 in acme/shop. There is no shell in this session, so the issue's text is the file `issue.md` in this project, and the output of the commands is given here. `spp kind 72` prints `raw`. The repo has the five state labels and the size labels. There is no `.out-of-scope/` and no `SCOPE.md`, and no other issue asks for this. In a scratch copy of the default branch, outside this checkout, the Keeper passed first. Then the issue's Break was made in `shop/coupon.py`, and `python -m pytest "tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged"` printed `FAILED tests/test_cart.py::test_an_expired_coupon_leaves_the_total_unchanged - assert 90.0 == 100` and exited 1. The person has said `ready-for-agent` is the outcome.

Do the work that outcome calls for as far as you can without a shell, and where a step needs the shell, say what it would run, including what you would check in the issue's body once harden has finished. Then write the comment you would post, and stop.
