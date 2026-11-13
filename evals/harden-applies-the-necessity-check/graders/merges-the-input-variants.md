---
type: regex
target: last_message
# One line holds the three percents (10, 25, 50) and the three totals in order (90, 60, 30, the 60 after the 90). The plan's own list, which a reply may quote, puts each case on its own line, so it cannot match. Whether that line is a Test scenario, and the only one, is `one-percent-scenario-line.md`.
pattern: '(?:^|\n)(?=[^\n]*\b10\b)(?=[^\n]*\b25\b)(?=[^\n]*\b50\b)[^\n]*\b90\b[^\n]*\b60\b[^\n]*\b30\b'
---
