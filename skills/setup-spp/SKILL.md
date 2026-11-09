---
name: setup-spp
description: Prepare this repository for spp, with its labels, the Routing block and the domain docs pointers, and offer ponytail.
disable-model-invocation: true
metadata:
  credits:
    - skill: setup-matt-pocock-skills
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/setup-matt-pocock-skills"
---

Make this repository ready for the spp pipeline, and change only what is not already right. A second run over a finished repo finds nothing to do, says so, and writes nothing. Every change is shown to the person before it is written, and the person confirms.

The pipeline is GitHub Issues through `gh`, so a repo on another tracker stops at step 1.

## 1. Look

Change nothing yet. Read [`GITHUB.md`](GITHUB.md) and run its preflight. Then gather:

- the `gh` and Node versions against the table's minimums, and the owner type, which decides Mode;
- the instructions file: `CLAUDE.md`, else `AGENTS.md`, else neither. When both exist, the one that holds a Routing block wins, and otherwise `CLAUDE.md`;
- whether that file already has a Routing block, a domain docs section, and the answers inside the block, among them its `Self-improvement mode:` line or, failing that, the old profile line that the migration in `BLOCKS.md` covers;
- whether the repo is private (`gh repo view --json isPrivate --jq .isPrivate`);
- the person's current Submission mode (`spp feedback submission`, which prints `Submission mode: <mode>`);
- the repo's labels (`gh label list --limit 200`) and, in `org` mode, the organization's issue types;
- the glossary and ADR locations: `GLOSSARY-MAP.md` or `GLOSSARY.md` at the root, and any directory of numbered ADR files;
- whether the `ponytail-review` skill is available;
- an existing Epic: an open issue that has Sub-issues (`gh issue list --state open --json number,title,subIssuesSummary`).

Done when each item has a found value or a stated "none".

## 2. Decide the changes

Build the change list by comparing what step 1 found with what [`BLOCKS.md`](BLOCKS.md) and the label table in `GITHUB.md` call for. Each entry is one of `create`, `change` or `unchanged`. Ask the person only what the repo cannot answer, one question at a time, with your recommendation first:

1. **Which file**, when neither `CLAUDE.md` nor `AGENTS.md` exists. Never create the second file of the pair.
2. **Self-improvement mode**, only when the block holds neither line. Show the recommendation table from `BLOCKS.md`. A block with only the old line is migrated by the table there, not asked about.
3. **Submission mode** (Auto or Review), only when step 3 will write the `Self-improvement mode:` line (a new block, or a block without that line) and the chosen mode is not Off. `spp feedback submission` prints Review both when unset and when chosen, so asking only alongside the new line keeps a second run quiet. When the repo is private and the person picks Auto, say that Auto acts as Review here. Show the current value from step 1 as the existing setting, and say the choice is kept for this repo only.
4. **The Laws line**, as `BLOCKS.md` describes it: the default list first, then one question about any other binding document.
5. **Panel thresholds**, only when the person has said they want their own; otherwise leave the line out.
6. **Domain docs layout**, only when a `GLOSSARY-MAP.md` or several glossaries suggest more than one context.

Mode, Sizes and the label set are never asked: Mode follows the owner type, and the label set is fixed. An answer the existing block already holds is kept without asking, which is what makes a second run quiet.

Done when every entry is marked and no question is left open.

## 3. Show, then write

Send the person the change list in full: each label to create, the exact text of each block to add or the lines of an existing block that change, each issue type to add, and the Submission mode as its own entry, marked as stored for the person, for this repo, outside the repo, so other repos are untouched. Name the file each edit lands in. When every entry is `unchanged`, say the repo is already set up, skip to step 4 and write nothing.

Write only after the person confirms, and only the entries that were shown:

1. Create the missing labels, and in `org` mode the missing issue types the person approved, with the commands in `GITHUB.md`.
2. Write or rewrite the Routing block from `BLOCKS.md`, replacing what lies between the markers and never adding a second block. When step 2 asked the Submission mode, store the answer with `spp feedback submission <Auto|Review>`; otherwise leave it alone.
3. Add the domain docs section when it is missing. Create no glossary or ADR file; `domain-modeling` does that when a term or a decision is settled.

Done when `gh label list` shows every label in the table, and re-reading the block shows each field line in the form `BLOCKS.md` gives: Mode exactly `org` or `labels-only`, and any Panel token one of `tickets>=N`, `size:L`, `no-size-L`, `lines>=N`.

## 4. Offer ponytail

Skip this step when step 1 found `ponytail-review` available.

Ask one question and wait for the answer: "Ponytail is a separate plugin that steers the agent toward the smallest change that works, and `/build` runs its `ponytail-review` beside the review gate on write-heavy Sub-issues. Install it?" Recommend yes only when the person has asked for it.

On a yes, read [`CLAUDE-CODE.md`](CLAUDE-CODE.md) for the install commands on this harness. On any other answer, install nothing and write nothing to the repo. Done when the answer is noted for the step 5 report.

## 5. Report and preflight

Send one table of what was created, changed and left alone, with a row for the Submission mode (set, or the current value left alone), and the version findings from step 1, naming any that fall short and the fix.

When step 1 found an Epic, run `spp preflight <epic>` and show its output. A failed preflight is a finding about that Epic, such as a missing plan comment; report it and its fix line, and do not treat it as a setup failure. With no Epic, say the pipeline is ready and suggest `/grill` to start one.

Done when the person has the table and either the preflight output or the suggestion.
