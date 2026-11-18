---
type: regex
target: trace
# Only a Read of the workflow that succeeded returns its name, so the pattern matches a tool result carrying it.
pattern: '"type":"tool_result"[^\n]*pull-request-checks'
---
