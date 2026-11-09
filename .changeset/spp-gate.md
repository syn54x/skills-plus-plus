---
"@syn54x/spp": minor
---

A new `spp gate <pr>` command reads a pull request's slice gate the way `spp merge` does: the verdict comment from a trusted author, judged against the pull request's current head. It prints `gate-pass`, `gate-fail` or `pr-open` with the head and each result, and `--json` adds the verdict and the maker that wrote it. A skill that asks whether the gate passed a pull request now runs one command instead of decoding the verdict trailer.
