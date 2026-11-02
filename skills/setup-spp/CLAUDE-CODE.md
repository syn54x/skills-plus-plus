# Claude Code

Read only when running on Claude Code. It maps the capabilities `SKILL.md` names to this harness.

| Capability | How |
| --- | --- |
| Is ponytail present | The skill `ponytail-review` appears in the session's skill list. |
| Install ponytail | Run both commands below, then tell the person to restart the session so the skills load. |

```bash
claude plugin marketplace add DietrichGebert/ponytail
claude plugin install ponytail@ponytail
```

Run them only after the person has said yes to the offer, and show them first. If `claude` is not on the PATH, give the person the two commands to run themselves instead.
