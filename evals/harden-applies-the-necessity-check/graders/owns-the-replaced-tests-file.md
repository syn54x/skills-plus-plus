---
type: regex
target: last_message
# A Files owned line (a list item or a bare line) that starts with Test: and names the replaced test's file.
pattern: '(?:^|\n)[ \t]*(?:[-*][ \t]*)?Test:[^\n]*`tests/test_coupon\.py`'
---
