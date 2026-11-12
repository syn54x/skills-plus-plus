---
"@syn54x/spp": minor
---

A session can now triage an issue with the new `triaging` skill: tell it "use triaging for #N" and it triages N exactly as `/triage N` does, so an agent such as a Chief of Staff session can send out one triage session per filed issue. The triage steps, references and credits move from `triage` to `triaging`, and every message in which `triaging` waits on you opens with `#<N> waits on you:`. `/triage` still shows the waiting issues when you name none, and now asks whether to triage here or in a sub-session where sessions can be started.
