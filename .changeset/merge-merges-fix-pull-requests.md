---
"@syn54x/spp": minor
---

`spp merge` now merges a Fix pull request: one that closes no Sub-issue of its Epic but `Refs` a Sub-issue, with a trusted passing verdict on its head, the Epic's integration branch as base and passing checks. It writes nothing to the wave comment, and a pull request that closes no issue and refs no Sub-issue is refused.
