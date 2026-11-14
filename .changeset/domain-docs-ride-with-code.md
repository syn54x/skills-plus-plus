---
"@syn54x/spp": patch
---

Glossary entries and ADRs now ship with the code that makes them true, never on the default branch ahead of it. `to-tickets` makes them an Epic's first Sub-issue, which blocks every other one, so they are the first merge into the integration branch. For a single issue, `harden` owns the files and carries their text, so they arrive in that issue's pull request.
