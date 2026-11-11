---
type: llm
focus: last_message
---

The build has just started two workers, for #51 and `https://github.com/acme/lib/issues/7` (as `spp next` names a ticket in another repo), and neither has reported back. `building` keeps a running list of the issues whose workers it started until each reports back, and passes it on every `spp next` as `--running`, each issue in the form the `dispatch` action named it. Without it, that issue, still ready because its worker has not claimed, would be dispatched a second time.

PASS if the next command is `spp next 50` (with or without `--json`, and without `--resume`) carrying `--running` with both `51` and `https://github.com/acme/lib/issues/7` (in either order, comma-separated); `acme/lib#7` or the URL of #51 in place of either form also passes.

FAIL if the next `spp next` has no `--running`, leaves either issue out of it, names the acme/lib issue as a bare `7`, carries `--resume`, uses `--started` for the list, or if the reply dispatches or starts another worker for the acme/lib issue.
