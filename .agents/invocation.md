# Who can start a skill

Each skill sits at `skills/<name>/SKILL.md`. What separates one skill from another, for this law, is who is allowed to start it.

- **User-invoked**: only a person can start it, by typing `/<name>`. Its frontmatter sets `disable-model-invocation: true` (Claude Code), and its `agents/openai.yaml` sets `policy.allow_implicit_invocation: false` (Codex). The `description` is written for a person scanning the slash-command menu: one line saying what the skill does, with no list of trigger phrases.
- **Model-invoked**: a person or the model can start it. This is the default: leave out `disable-model-invocation` and the `policy` block. The `description` is written for the model, so it names the situations that should trigger it ("Use when ..."). Keep a skill model-invoked when the model could sensibly reach for it unprompted.

Every skill carries `agents/openai.yaml` next to its `SKILL.md`, holding the Codex picker fields (`interface.display_name`, `interface.short_description`) and, for a user-invoked skill, the policy line. The frontmatter flag and the policy line always agree: a skill is user-invoked on every harness or on none.

A user-invoked skill is out of the model's reach, so no other skill can start it either. A user-invoked skill may start model-invoked skills; nothing may start a user-invoked one except the person.

## Calling another skill

A skill that needs another skill says so as an instruction to use the Skill tool: `Call the Skill tool with "grilling"`. A relative link into another skill's folder, or a bare `/name` in passing, does not reliably fire it; naming the tool does. The bare name also keeps the line free of any one harness's slash syntax. Material that several skills share lives in the skill that owns it, and the others reach it by calling that skill.

One call starts one skill. When a step needs two, write `Call the Skill tool twice, for "grilling" and "domain-modeling"`.

This applies only to a skill telling the agent to run another skill now. Prose that lists skills for a person to choose from (`ask-spp`, the README) names them as plain `/name` labels.

When a step depends on a user-invoked skill, address the person: "ask the user to run `/setup-spp`". Never phrase it as a Skill tool call.

Reading `GLOSSARY.md` for its terms is a plain pointer to the file. Calling `domain-modeling` means the active work of challenging and recording terms and ADRs.

## Friends

A friend is a skill another plugin ships that spp skills may call when it is installed. Each spp skill that calls a friend first checks the friend is available and runs unchanged when it is not. `scripts/check-invocation.ts` reads this list and skips its own existence and invocation checks for these names:

- `ponytail-review`: the ponytail plugin's runtime review, run beside the slice gate on write-heavy slices.

## The check

`node scripts/check-invocation.ts` enforces this page in CI: the flag and the policy line agree, every skill has `agents/openai.yaml`, frontmatter values contain no unquoted `: ` or ` #`, and every `Call the Skill tool` target and every agent `skills:` preload is a model-invoked skill in `skills/` or a friend.
