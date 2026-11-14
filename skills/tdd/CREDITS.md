# Credits

`tdd` draws on five sources. From each, spp took the idea, not the text: the wording is spp's own.

- Matt Pocock's [`tdd`](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd): `tdd` is a rewrite of it. It keeps agreeing the seams where tests go before writing them, the red-green loop, the anti-patterns to avoid, and a reference file of example tests.
- Builder.io's [`test-audit`](https://github.com/BuilderIO/agent-native/tree/main/.agents/skills/test-audit), in agent-native: the gate a test passes before it is written, and one owner per contract, which became the **Necessity check** and its one-owner rule.
- Jesse Vincent's [`writing-good-tests`](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md), in Superpowers: every test names the break it catches, and the exclusions for trivial code.
- Matthew Blode's [`test-audit`](https://github.com/mblode/agent-skills/tree/main/skills/test-audit), in mblode/agent-skills: the junk patterns an audit hunts for, and evidence behind each removal.
- Paul Hammond's [`test-design-reviewer`](https://github.com/citypaul/.dotfiles/tree/main/claude/.claude/skills/test-design-reviewer), in citypaul/.dotfiles: the "Necessary" property, that a test is kept only when losing it would lose evidence.
