---
type: regex
target: trace
# A tool result that carries the notes' text: only a lookup that succeeded returns it. A denied Read returns an error instead, so it does not count.
pattern: '"type":"tool_result"[^\n]*Delivery timeout: 30 seconds per attempt'
---
