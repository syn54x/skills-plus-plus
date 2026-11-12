---
type: llm
focus: last_message
---

`triaging` has found #61 true, clear and buildable as one pull request, so its outcome is `ready-for-agent`, and it must wait for the person's word before applying it. A parent session may see only the opening of this message.

PASS if the reply's first line opens with `#61 waits on you:` and names what it waits on (the person's word on the proposed outcome, such as confirming `ready-for-agent`), and the evidence or reason follows that line.

FAIL if the first line is anything else (a heading, a summary, the evidence), if the waiting line names another issue, or if the reply applies the role or calls harden without waiting.
