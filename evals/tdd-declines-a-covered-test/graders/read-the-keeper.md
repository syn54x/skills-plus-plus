---
type: regex
target: trace
# A tool result that carries the existing test's name: only a read or search that succeeded returns it, so the Keeper was read before the answer.
pattern: '"type":"tool_result"[^\n]*test_an_expired_coupon_leaves_the_total_unchanged'
---
