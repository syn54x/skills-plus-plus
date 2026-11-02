---
type: regex
target: trace
# Any Write call on GLOSSARY.md carrying Slot, from the session or from a helper agent it hands the write to: the trace records both.
pattern: '"name":"Write","input":\{[^\n]*?"file_path":"[^"]*GLOSSARY\.md"[^\n]*Slot'
---
