---
type: llm
focus: last_message
---

The build has just started two workers, for #51 and `acme/lib#7`, and neither has reported back. `building` keeps a running list of the issues whose workers it started until each reports back, and passes it on every `spp next` as `--running`, each issue in the form the `dispatch` action named it. Without it, `acme/lib#7`, still ready because its worker has not claimed, would be dispatched a second time.

PASS if the next command is `spp next 50` (with or without `--json`, and without `--resume`) carrying `--running` with both `51` and `acme/lib#7` (in either order, comma-separated), or with the issue URLs of both.

FAIL if the next `spp next` has no `--running`, leaves either issue out of it, names `acme/lib#7` as a bare `7`, carries `--resume`, uses `--started` for the list, or if the reply dispatches or starts another worker for `acme/lib#7`.
