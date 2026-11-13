---
type: regex
target: trace
# Both tool results must carry a test's name: only a Read that succeeded returns it. The first alternative is test_cart.py read first, the second the other order.
pattern: '"type":"tool_result"[^\n]*test_an_expired_coupon_leaves_the_total_unchanged[\s\S]*"type":"tool_result"[^\n]*test_a_percent_coupon_takes_its_share_off|"type":"tool_result"[^\n]*test_a_percent_coupon_takes_its_share_off[\s\S]*"type":"tool_result"[^\n]*test_an_expired_coupon_leaves_the_total_unchanged'
---
