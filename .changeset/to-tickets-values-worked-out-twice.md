---
"@syn54x/spp": minor
---

`/to-tickets` now checks the set for values worked out twice. When one Sub-issue works a value out from another module's output (a client inferring each row's state from a summary the server returns), it asks whether the module that holds the inputs should produce the value itself. If so, the producer gains a Produces line or a Sub-issue of its own before anything is released, and the consumer reads the value. A derivation you meant to keep is yours to accept.
