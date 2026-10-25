# Marker comments carry a data trailer; sync-progress owns their shapes and the hand-back

`sync-progress` exposed "marker plus whole body file", so every skill that wrote a **Marker comment** had to know every other writer's lines under the same marker. `review-panel`'s wave upsert dropped the `Edges added:` line `build-epic` wrote, and the **Retro** read that absence as zero; the wave comment was also overwritten each wave while the retro summed across waves. The retro reached the rest of its measures by regex over four prose templates it did not own. We make `sync-progress` deep: callers name the comment and the fields they set (`progress`, `plan`, `wave`, plus a raw `upsert` for the one-writer comments), the module reads the existing comment, merges, and renders the whole body; the state round-trips through a base64 JSON trailer in a hidden HTML comment on the last line, and the rendered lines above it are for humans. The three-step stop sequence (label pair, clear the **Claim mark**, progress line) becomes one operation on the same seam, the **Hand-back**.

## Decisions

- **One owner per shape.** `sdd-progress`, `sdd-plan` and `sdd-wave` have two writers each or a machine reader, so the module owns their fields; `sdd-summary`, `sdd-retro` and `sdd-feedback-draft` have one writer and stay a raw marker upsert (owning them would move the template, not concentrate it).
- **One wave comment per epic.** Waves and panel rounds are lists inside its data; `review-panel` records each round's verdict, report link and counts there instead of overwriting the wave. The marker name stays `sdd-wave` so the retro's regex fallback still matches epics built before this.
- **Trailer, base64.** `--` inside an HTML comment ends it, and reasons and edge lines carry `--add-blocked-by`; base64 never terminates and the module is the trailer's only reader and writer (Renovate round-trips PR state through hidden markers the same way). Readers go through `gh api`; `claude-code-action` strips HTML comments from the context it hands a model, so a marker is never read from that context.
- **Readers keep a fallback.** `sdd-retro.sh` reads the trailer first and keeps its regex path for epics built before, as the claim-time fallback did in ADR 0006. A comment with no trailer is rendered fresh by the first write; only an epic mid-build across the upgrade loses earlier prose.
- **No label on a cloud PASS.** `review-pr` labelled a passed cloud ticket `ready-for-human` ("requires human implementation" in the triage labels), and the retro counted it as an escalation. The reviewed open PR and the status `verify-passed` are the signal. `ready-for-human` means one thing.
- **GitHub only.** The GitLab and local-tracker claim adapters leave `sync-progress`: the SDD pipeline runs on GitHub Issues alone (`setup-syn54x-skills/SDD.md`), so that seam had one adapter.

## Considered options

- **Callers pass a markdown fragment and the module merges by heading**: every caller must know the merge rules, so the interface is as wide as the implementation.
- **Plain JSON in the trailer with a rewrite rule for `--`**: one more rule every writer must know.
- **One comment per wave**: the upsert would need a second key, and the panel verdict would have no wave to land on.
- **Regex over the rendered prose, as today**: a wording change in another skill passes that skill's checks and nulls the retro in production.

## Consequences

- Every SDD writer becomes one line naming a subcommand; the status enum loses `done` and folds `blocked` into `handed-back` with a route and a reason.
- `build-epic` records each gated PR on the wave, which makes the retro's second PR source real.
- The fixture runner is generalised to one script over `scripts/fixtures/<script>/`, and the stub `gh` records writes, so the module is tested through its interface.
