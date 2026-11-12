---
"@syn54x/spp": minor
---

A session can now start a build with the new `building` skill: tell it "use building for #N" and it builds N exactly as `/build N` does, so an agent such as a Chief of Staff session can start a build without anyone typing `/build`. The build's steps, references and credits move from `build` to `building`; `/build` still works as before and now hands the issue to `building`.
