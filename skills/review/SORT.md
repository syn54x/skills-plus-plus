# Sorting the run

The table maps the linked issue and what `spp kind N --json` prints to the run. Read the first row that fits.

| Linked issue | `spp kind N --json` | Run |
| --- | --- | --- |
| `#N` | `raw` with a `rule` | `pin-present` or `pin-match`: a hardened issue whose Verify block lost its pin. Stop as step 3.1 does on a refusal: post no verdict and report to whoever started the review that the issue needs harden again. |
| no closing line to a Sub-issue of its Epic, but `Refs #N` (or `Refs owner/repo#N`, or an issue URL); `N` is read for this row only | `sub-issue`, and `BASE` is that Sub-issue's Epic's integration branch | A fix: both verdicts. Run the Sub-issue's Verify block with `spp verify N`, judge spec against the findings the body names and the Sub-issue's acceptance criteria, and record with `spp verdict --ticket N`. |
| none, or `#N` (any other `Refs` shape is none) | `raw`, no `rule` | Quality only. The comment's first line says `No linked Sub-issue or One-off: quality verdict only.` (naming `#N` as raw when there is one) and no verdict marker is written, so a gate never passes it. |
| `#N` | `epic` | The Epic's own pull request: read [`EPIC.md`](EPIC.md) and follow it in place of steps 4 to 6. |
| `#N` | `sub-issue` | A slice of an Epic: both verdicts. |
| `#N` | `one-off` | A slice with no Epic: both verdicts. |
