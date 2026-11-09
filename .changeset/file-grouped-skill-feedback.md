---
"@syn54x/spp": minor
---

`spp feedback file <fingerprint>` files a pending candidate on the one grouped Skill feedback issue for its skill step and category on syn54x/skills-plus-plus, creating it with the `skill-feedback` label when none is open, and rewrites your own tally comment there (Signals and runs per plugin version). Under your Submission mode Review it prints what it would post and exits 3, and files only when run again with `--confirm <hash>` for that text; under Auto it files at once, except in a private repo. With `--epic`, the strictest Self-improvement mode of the Epic's repos applies. The outbound check runs on everything it posts, and nothing is filed under `CI` or with the mode Off.

`spp feedback skip <fingerprint>` drops a candidate for good, and `spp feedback pending` now leaves out skipped candidates and filed ones until a newer Signal arrives. `spp feedback submission [Auto|Review]` reads or sets your Submission mode, kept in `config.json` in spp's config directory.
