# Credit each skill's sources, and copy an incumbent's text only when it beats ours

**Amends [ADR 0008](./0008-rebuild-spp-from-scratch.md)'s Own words decision.**

ADR 0008 rewrote every skill in this project's voice and credited the incumbents once, in the README. That list says which projects spp learned from, but not which skill, or which part of a skill, came from where. And the rule against copying any of their text meant paraphrasing an instruction even when the original was the better one, so the rewrite could be weaker than its source and nothing caught it.

We credit at the level of the skill, and we allow copying an incumbent's text, under a bar that being allowed to copy does not clear on its own.

## Decisions

- **Credits per skill.** A skill that draws on an incumbent lists its sources in its `SKILL.md` frontmatter, as a list under `metadata.credits`. Each entry gives `skill`, `author`, `organisation` when there is one, and `url`, quoted, since an unquoted `: ` is invalid YAML there:

  ```yaml
  metadata:
    credits:
      - skill: grill-me
        author: Matt Pocock
        url: "https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me"
  ```

  A `CREDITS.md` beside the `SKILL.md` says, in prose, which part of the skill came from each source, and whether it took the idea or the text. A skill that is spp's own carries neither. The README's Credits section stays as the summary across the project.
- **Copy only when both hold.**
  1. The source's license allows it, and we meet its terms. For MIT, that means its copyright line in `LICENSE`, beside the others, for as long as any of its text survives.
  2. Its text works at least as well as anything we would write. A permissive license is never the reason to copy; it only makes copying possible.
- **The pull request makes the case.** A pull request that copies text says why the copy beats our own wording. When an eval case covers the skill, the run with the copied text scores no lower than the run with ours.
- **Copied text follows the Prose rules.** The repository's own rules still apply to text we copy: no em-dashes, and `GLOSSARY.md` terms for anything it defines. `CREDITS.md` says the text was adapted when those edits changed it.

## Considered options

- Keep the own-words rule: it holds the voice together but keeps a weaker paraphrase where the original was better.
- Copy whatever a license allows: it brings in text nobody judged better than ours, and mixes voices for no gain.
- Credit only in the README: nobody can tell which part of which skill came from where.

## Consequences

- Every existing skill is audited once for its sources, and gets its credits and `CREDITS.md`.
- A repo check enforces the credits' shape and that each credited skill has its `CREDITS.md`.
- The incumbent watch's `adopt` verdict no longer requires spp's own words.
- On 2026-11-03 all six incumbents in the README (mattpocock/skills, Superpowers, Compound Engineering, ECC, OpenSpec and GSD) were MIT. A license can change, so each copy checks the source's license at the time of copying.
