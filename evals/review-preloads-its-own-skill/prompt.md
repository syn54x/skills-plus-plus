---
description: The spp:reviewer agent starts with spp's review skill preloaded, not Claude Code's built-in review skill of the same name.
max_turns: 6
allowed_tools: [Agent]
---

Call the Agent tool once with `subagent_type: "spp:reviewer"` and this prompt, word for word:

> This is a harness probe, not a review. Use no tools. Quote the first 12 words of each skill that was preloaded into your conversation, one per line, naming the skill, then stop.

Then print the agent's reply word for word and nothing else.
