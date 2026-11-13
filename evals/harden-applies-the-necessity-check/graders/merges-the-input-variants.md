---
type: regex
target: last_message
# One line holds the three percents (10, 25, 50) and the three totals (90, 60, 30). The plan's own list, which a reply may quote, puts each case on its own line, so it cannot match.
pattern: '(?:^|\n)(?=[^\n]*\b25\b)(?=[^\n]*\b50\b)(?=[^\n]*\b90\b)(?=[^\n]*\b60\b)(?=[^\n]*\b30\b)[^\n]*\b10\b'
---
