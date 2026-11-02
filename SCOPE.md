# Scope

spp is a spec-driven delivery system for one maintainer's daily work, shared in public. It is curated: ideas are welcome, and each is judged against the bar below. Issues track changes to spp itself.

## What spp covers

- The five paths in `GLOSSARY.md`: an Epic from grilling to close, a single filed issue through triage to build, wayfinding unknown territory, architecture scans that file issues, and tiny work that needs no spp at all.
- The `spp` command-line tool, which computes the pipeline's state from GitHub.
- The skills those paths call, written in spp's own voice, and their docs pages.
- Claude Code as the one harness 2.0.0 ships for. Codex and Cursor come later through the portability law in `CLAUDE.md`, not through harness-specific branches in the skills.

## The bar

An idea or feedback issue stays open only when it clears both parts:

1. **Observed failure.** It describes something that went wrong in a real session: what you ran, what spp did, and what you expected. A hypothetical improvement does not clear this part.
2. **Fits the design.** It does not repeat a rejection recorded in `.out-of-scope/`, and it is not a config option, a harness-specific branch, or a tweak for one person's workflow. Those belong in your own `CLAUDE.md` or `AGENTS.md`.

Size does not matter: a one-word fix and a rewrite face the same bar. Reactions and +1 comments do not count towards it.

## Out of scope

- Shipping Codex, Cursor or other harness adapters in 2.0.0.
- Issue trackers other than GitHub Issues.
- Agent teams, and cloud workers as a first-class driver.
- Migrating 1.x installs automatically: the rename to `spp` needs a reinstall.
- Carrying any other project's skill text verbatim. Concepts are credited in the README; the words are spp's own.
- New skills by outside proposal. If a behaviour composes from existing skills, it does not get a new one.

Triage records each new rejection as one file in `.out-of-scope/`, so it is not argued again.

## Unclear issues

An issue that cannot be judged against the bar gets one round of questions and the `needs-info` label. With no reply in 14 days, it is closed. Rejections close as "not planned".
