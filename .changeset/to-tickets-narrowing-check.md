---
"mattpocock-skills": patch
---

to-tickets (SDD pass): the consistency pass now checks that each epic requirement keeps its full strength in the tickets it maps to. An accidental narrowing is widened inline; a deliberate one is put to the user and, once approved, recorded as a `**Narrows:**` line in the ticket, a `**Narrowed:**` line in the plan comment, and an offered Spec deltas entry. The report table gains a Narrows column. review-pr and review-panel treat a declared narrowing as accepted scope instead of a `ticket-mandated` Spec finding.
