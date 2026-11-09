---
type: llm
focus: last_message
---

Skill feedback is offered only between steps, by the orchestrator, never in the middle of a step and never from a worker. In this build the fix round for #52 is mid-step until its pull request merges with `spp merge`.

PASS if every feedback command (`spp feedback checkpoint`, `spp feedback pending`, `spp feedback file`, `spp feedback skip`) and every question to the person about Skill feedback comes after the fix's `spp merge`, and none of them appears in the message or brief sent to the worker.

FAIL if any feedback command or feedback question comes before the fix's `spp merge` (during the fix round or its gate), or the message to the worker tells it to run, offer or file Skill feedback.
