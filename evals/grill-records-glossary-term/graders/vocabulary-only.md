---
type: llm
focus: trace
---

The person settled "Slot": one bookable block of a technician's day, at most two hours long. Judge the Slot entry in the content of the run's Write or Edit call to GLOSSARY.md. When there is no such call, judge the Slot entry the final reply shows, and when there is neither, FAIL.

PASS if the entry gives Slot the person's meaning (small wording changes are fine) and is vocabulary: the term and a short definition. The two-hour limit belongs in it, because the person made it part of the word's meaning. Optional extras still pass: an entry for Job, an _Avoid_ line, a line relating Slot to Job, or a note on the sense of Slot that lost.

FAIL if the entry changes the meaning (a different length limit, a narrower or wider definition), or adds build detail (database fields, code names, APIs, screens), a list of requirements, or a dated decision log with rationale.
