# Design it twice

How to produce rival interfaces for one module and choose between them. Run it only when the person has chosen the module and asked to explore its interface. Uses the vocabulary in [`SKILL.md`](SKILL.md) and the dependency kinds in [`DEEPENING.md`](DEEPENING.md).

## 1. Frame the problem

Write a short framing for the person: the constraints any interface must meet, the dependencies and their kinds, and a rough code sketch that makes the constraints concrete (an illustration, not a proposal). Show it and go straight on to step 2; the person reads while the designs are drafted.

## 2. Draft rival designs

Draft at least three designs, each under a different constraint:

1. The smallest interface: one to three entry points, as much behaviour behind each as possible.
2. The most flexible: many use cases and room to extend.
3. The common caller first: the usual call is trivial.
4. When dependencies cross a seam: ports and adapters.

When the harness can run helper agents in parallel, give each design to its own helper with a technical brief: the files, the coupling, the dependency kinds, what sits behind the seam, and the vocabulary from `SKILL.md` and the project's glossary. Otherwise draft them yourself one at a time, each from the brief alone, without revising an earlier one to match.

Each design gives:

- the interface: types, entry points, parameters, invariants, call order and error modes;
- an example of a caller using it;
- what the implementation hides;
- the dependency strategy and its adapters;
- where leverage is high and where it is thin.

## 3. Compare and recommend

Present the designs one after another, then compare them by depth, locality and where the seam sits. Close with a recommendation: the design you would choose and why, or a hybrid when parts of two combine well. Give one clear pick, not a menu.
