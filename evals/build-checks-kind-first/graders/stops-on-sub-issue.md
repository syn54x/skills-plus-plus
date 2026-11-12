---
type: llm
focus: last_message
---

The person typed `/build 405` in a session that can start sessions, and `spp kind 405` says #405 is a Sub-issue of the Epic #403. A Sub-issue is built through its Epic, so the build stops here, before any question about where to run.

PASS if the reply stops in this session, says #405 is a Sub-issue of #403 (or of its Epic) and is built through it, and asks the person to run `/build 403`.

FAIL if the reply asks whether to build here or in a sub-session, starts or writes out a call to start any session, starts `building` for #405, or plans or dispatches any work for #405.
