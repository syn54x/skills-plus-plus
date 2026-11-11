---
type: llm
focus: last_message
---

The session was told to use `building` for Epic 50 of `acme/app`. Pull request #61 on #52 failed its gate, the worker that opened it died with an earlier session, and the person answered "I take it". `spp next` reads only GitHub and its flags, so unless the answer leaves a mark it reads, the next `spp next` prints the same `fix` for #61 and the session asks again. Taking it over puts #52 on the running list, so every later `spp next` passes `--running 52` and waits on it, until the person says they are done.

PASS if the next `spp next 50` command in the reply carries `--running` with 52 in its value (`--running 52`, or 52 in a comma-separated list), and the reply asks the person no further question about #52 or #61.

FAIL if the next `spp next 50` in the reply has no `--running` naming 52, if no `spp next` follows the answer at all, if the reply asks again whether to hand #52 back or take #61 over, or if it asks for anything more about #61 before the person says they are done.
