---
"@syn54x/spp": patch
---

Harden now checks what a contract mandates against the ADRs, the glossary's `_Avoid_` lines and the contract's own text before it writes it, so a worker is not told to write something those rule out.
