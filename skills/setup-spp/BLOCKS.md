# What setup writes into the instructions file

Two edits go into `CLAUDE.md` (or `AGENTS.md`): the Routing block and a short domain docs section. Each is found by a fixed marker or heading, so a second run can tell whether it is already there.

## Routing block

The template below is the whole block. Replace each `{{slot}}` with the answer from the step that owns it, and delete the `Panel` line when the person set no thresholds. `parseRouting` in `spp/src/routing.ts` reads the block, so keep the field names and the markers exactly as written.

```markdown
<!-- sdd-routing -->
## Agent workflow

- Every spec and plan is a GitHub issue, and no file in the repo holds one.
- Plan with `/grill` (or `/auto-grill`), then `/to-spec`, then `/to-tickets`. Send a filed bug or enhancement through `/triage`. Build with `/build <N>`.
- A worker writes the test first, runs the Sub-issue's Verify block, opens a pull request that says `Closes #N`, and never merges.
- A Sub-issue is ready when it is open, has no open blocker, is unheld (no `claimed` label, no assignee) and carries `ready-for-agent`. A worker adds `claimed` before it starts. If it stops without a pull request it hands the Sub-issue back: route it, clear the mark, record why.
- Each issue keeps a single progress comment, opened by the `<!-- sdd-progress -->` marker, which workers rewrite where it stands.
- Mode: {{mode}}
- Sizes: {{sizes}}
- Panel: {{panel}}
- Upstream feedback: {{feedback}}
- Laws: {{laws}}
<!-- /sdd-routing -->
```

| Slot | Value | Notes |
| --- | --- | --- |
| `mode` | `org` or `labels-only` | `org` when the repo's owner is an organization, because only organizations have issue types. |
| `sizes` | `` `size:S/M/L` labels `` | The labels `to-tickets` and triage put on each Sub-issue. |
| `panel` | `tickets>=N`, `size:L`, `lines>=N`, comma-separated | Each token overrides one threshold; the rest keep their defaults (4 tickets, any size L, 1,000 lines). Leave the line out when there is no override. The `size:L` token is always on. |
| `feedback` | `off`, `counts`, `detailed` or `attributed` | What `close-epic` may put in a skill-defect issue it proposes, each one shown and approved first. Default `off`. |
| `laws` | comma-separated paths | The repo documents workers and reviewers must obey. A trailing `/` marks a directory. |

### Upstream feedback profiles

| Profile | What a proposed issue may carry |
| --- | --- |
| `off` | Nothing is proposed. |
| `counts` | The skill, the step, a category, the retro's counts and one sentence the person types. No repo name, URL, title, path or code. |
| `detailed` | `counts` plus a short account of the skill's instruction, the agent's response and the manual work that followed. |
| `attributed` | `detailed` plus the repository's name, with links to the Epic and its Sub-issues and pull requests. |

Recommend `off` unless the repo is the person's own, and `counts` or `detailed` when it is. A profile is public once filed, so the person picks it; never default to more than `off`.

### The Laws line

The default is whichever of these exist, each tested on its own: `GLOSSARY.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `CONCEPTS.md` and the ADR directory. Ask once whether anything else binds, such as a design system or a page to read before UI work. Write paths from the repo root.

On a re-run the existing line is the starting point. Every entry on it stays, and the only proposals are documents it does not list yet.

### Rewriting an existing block

Replace what sits between the markers in place and never append a second block. Carry forward each answer the block already holds (Mode, Sizes, Panel, Laws, Upstream feedback), and write the other lines from the template only when they differ. A block that already equals what would be written is left alone.

## Domain docs section

Appended to the file after the Routing block, only when the section is missing. Name the real paths found in step 3, and use one of the two forms.

Single context:

```markdown
## Domain docs

- Glossary: `GLOSSARY.md`
- Decisions: `docs/adr/`
```

Several contexts, when a `GLOSSARY-MAP.md` exists or the person wants one:

```markdown
## Domain docs

- Glossary map: `GLOSSARY-MAP.md`, which points at one `GLOSSARY.md` per context
- Decisions: `docs/adr/` for the whole system, plus a `docs/adr/` inside a context for its own
```

The section records where things are, nothing more. Create no glossary or ADR file here: `domain-modeling` writes them when a term or a decision is settled. A section headed `## Domain` or `## Domain docs` that already names the paths counts as present.
