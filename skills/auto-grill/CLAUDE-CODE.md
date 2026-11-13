# auto-grill on Claude Code

Read only when running on Claude Code. Each capability `SKILL.md` names, and the tool that provides it here.

| Capability | On Claude Code |
| --- | --- |
| Call another skill | The Skill tool. A plugin skill may be listed under its plugin's prefix, such as `spp:grilling`. |
| Show a visual inline in the conversation | The `show_widget` tool of the `visualize` server, present in the Claude desktop app and absent from a terminal session. Before the first drawing, call the same server's `read_me` once with the `mockup` and `diagram` modules, and follow it. When the tool is not in the session, draw in text. |
| A button that sends the Principal's answer | Inside the widget, a button whose click calls `sendPrompt("<the item's number and letter>\n")`, such as `sendPrompt("1B\n")`. The trailing line break keeps two clicks from running together; if the app drops it, `1B2A` still parses. |

One widget per Escalation or Challenge. Send each widget preceded by its item's question as ordinary text, and the Best fit after it, never inside the widget, so the answer still reads when the widget does not render. Two widgets are never sent without that text between them: write the first item's question, widget and Best fit, then the second item's question, and only then its widget.
