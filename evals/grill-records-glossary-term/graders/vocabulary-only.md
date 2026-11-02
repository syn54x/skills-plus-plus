---
type: llm
focus: trace
---

Judge only the glossary entry for Slot that the run wrote with Write or Edit, or showed in its reply when file tools were unavailable.

PASS if that entry is vocabulary: the term and a short definition of what it means. The two-hour limit belongs in it, because the person made it part of the word's meaning. Optional extras still pass: an entry for Job, an _Avoid_ line naming words not to use, or a line relating Slot to Job. Questions the reply asks about other terms do not count against it.

FAIL if the entry adds build detail (database fields, code names, APIs, screens), a list of requirements, or a dated decision log with rationale, or if the run wrote an ADR file for this naming choice.
