# Writing a skill

What changes when the document is a skill. Everything else about writing it is in [`SKILL.md`](SKILL.md).

## Frontmatter and the picker file

- `name` matches the skill's folder and uses only lowercase letters, digits and hyphens.
- `description` is the skill's pointer (see Context pointers in `SKILL.md`), within the 1,024-character budget.
- A frontmatter value that contains `: ` or ` #` is quoted, or some hosts drop the whole block without saying so.
- Beside `SKILL.md`, `agents/openai.yaml` holds the Codex picker fields, `interface.display_name` and `interface.short_description`, and for a user-invoked skill the policy line below.

## Model-invoked or user-invoked

The choice is the two loads traded against each other.

| | Model-invoked | User-invoked |
| --- | --- | --- |
| Who can start it | The agent, another skill, or the person | Only the person, by typing `/<name>` |
| Frontmatter | No `disable-model-invocation` | `disable-model-invocation: true` |
| `agents/openai.yaml` | No `policy` block | `policy.allow_implicit_invocation: false` |
| Description written for | The model: what it is, then each case that should start it ("Use when ...") | The person scanning a menu: one line, no trigger list |
| What it costs | Context load on every turn | Cognitive load: the person must remember it exists |

Make a skill model-invoked only when the agent must reach it unprompted or another skill must call it. Every other skill is user-invoked, which costs no context at all. The flag and the policy line always agree, so a skill is user-invoked on every harness or on none.

A model-invoked skill made only of reference is the home for material several skills need: they call it rather than copy it. Two user-invoked skills cannot share material through each other, since neither can start the other; put it in a model-invoked skill or a plain file both point to.

Split a model-invoked skill out of a larger one only when it has its own leading word that people actually type, or when another skill must call it. Its description is context load paid from then on.

## Calling another skill

Write the call as an instruction: `Call the Skill tool with "<name>"`, or `Call the Skill tool twice, for "<a>" and "<b>"` when a step needs two. A relative link into another skill's folder, or a `/name` mentioned in passing, does not reliably start it. This phrase is the one tool name a skill carries: every harness that runs skills has a way to start one, and that harness's reference file maps the phrase to it.

The target must be model-invoked. When a step depends on a user-invoked skill, the skill tells the agent to ask the person to run `/<name>`.

## Router skills

When user-invoked skills pile up past what a person can remember, one user-invoked **router** lists them with the situation each one fits, so the person remembers one name instead of many. It can only point: the person still types the name it recommends.

## Harness reference files

A step that needs a harness-specific tool names the capability and points to the file for the harness it is on: "Start an isolated worker for the ticket. On Claude Code, `CLAUDE-CODE.md` names the tool." Name each file for its harness, keep one per harness per skill, and keep in it only the mapping from capability to tool or command, plus that harness's quirks. Detect a capability by checking that its tool is present, never by guessing the harness from its name.
