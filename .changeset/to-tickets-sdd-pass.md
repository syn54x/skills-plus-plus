---
"mattpocock-skills": minor
---

`to-tickets` gains an SDD pass, read from `to-tickets/SDD.md` when the repo carries the `<!-- sdd-routing -->` block. Before publishing it adds Files owned, Interfaces, Test scenarios and a Verify block to every ticket, runs a no-placeholder gate (failures publish as `needs-info`), and sizes each ticket. It publishes each ticket in the repo its files belong to, with native parent and blocked-by links set at creation, and pins one `<!-- sdd-plan -->` comment on the epic. This replaces `to-tickets-plus` from `syn54x/skills`, which had to call `/to-tickets` and could not, because `to-tickets` is user-invoked.
