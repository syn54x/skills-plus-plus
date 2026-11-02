# Marker comments carry a data trailer, and spp owns their shapes

In 1.x every skill that wrote a **Marker comment** passed a whole body, so each writer had to know every other writer's lines under the same marker. One writer's update dropped a line another had written, and the **Retro** read the missing line as zero. The retro also reached its numbers by regex over prose templates it did not own.

We make one module own the comments. A caller names the comment and the fields it sets; `spp` reads the existing comment, merges, and renders the whole body. The state round-trips through a JSON object, base64-encoded, in a hidden HTML comment on the last line (`<!-- sdd-data: ... -->`). The rendered lines above it are for people; the trailer is what `spp` reads back.

## Decisions

- **Owned shapes.** The progress comment (`<!-- sdd-progress -->`) on a **Sub-issue**, and the plan (`<!-- sdd-plan -->`) and wave (`<!-- sdd-wave -->`) comments on an **Epic**, have several writers or a machine reader, so `spp progress`, `spp plan` and `spp wave` own their fields. Comments with one writer and no machine reader (the summary, the retro) stay a raw upsert, because owning them would only move the template.
- **One wave comment per Epic.** Waves and panel rounds are lists inside its data, so a retried write replaces its own entry and never duplicates one.
- **Base64.** A `--` inside an HTML comment ends it, and reasons often carry flags such as `--add-blocked-by`. Base64 never does.
- **Read through the API.** Some harnesses strip HTML comments from the context they give a model, so a marker or trailer is always read from `gh api`, never from that context.
- **A trailer that does not decode stops the write.** Rendering fresh would erase the state, so `spp` exits with an error and writes nothing.
- **The Hand-back is one operation** on the same module: record the reason on the progress comment, apply the route label, then clear the **Claim mark**. A failure part-way leaves the ticket held, never released without a route.
- **GitHub only.** spp runs on GitHub Issues, so there is one tracker adapter.

## Considered options

- Callers pass a markdown fragment merged by heading: every caller must know the merge rules.
- Plain JSON with an escape rule for `--`: one more rule every writer must remember.
- Regex over the rendered prose: a wording change in one skill passes its own checks and silently breaks the retro.
