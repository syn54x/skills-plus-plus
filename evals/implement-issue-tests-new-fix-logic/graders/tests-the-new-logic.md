---
type: llm
focus: last_message
---

A fix that replaces the hand-kept list of container types with one recursive descent writes new logic, and that logic has edge cases of its own: a value that contains itself (a cycle, which would recurse forever), a `Set`, a class instance, a `null` or a primitive, a very deep value.

PASS if the plan names edge cases of the new descent beyond the `Map` case the finding reported, a value that contains itself among them, and plans a test for each case it names.

FAIL if the only test planned is for the `Map` case, or the plan lists edge cases but gives no test for them.
