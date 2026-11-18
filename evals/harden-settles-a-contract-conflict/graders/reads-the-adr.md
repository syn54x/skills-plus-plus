---
type: regex
target: trace
# Only a Read of the ADR that succeeded returns its text.
pattern: '"type":"tool_result"[^\n]*Entry ids are never reused'
---
