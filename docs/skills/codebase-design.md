## What it does

`codebase-design` gives spp one set of words for the shape of code: **module**, **interface**, **depth**, **seam**, **adapter**, **leverage** and **locality**, each defined against the others, with the loose words they replace (component, service, API, boundary). It adds the principles that follow from them, such as the deletion test, and the **Depth check** that both review gates run on a pull request.

It is a reference, not a process. It asks no questions, writes no files and starts no work of its own. Started on its own, it answers the design question in front of it in these terms and stops; the skills that drive design work (grill, improve-architecture, review) call it for the words and the checks.

## When to reach for it

Type `/codebase-design`, or the agent starts it when a task fits: designing or reshaping a module's interface, deciding where a seam goes, making code easier to test, judging whether an extraction pays for itself, or running the Depth check on a pull request.

| The problem | Reach for |
| --- | --- |
| One module's shape: its interface, its seam, its depth | `codebase-design` |
| The words of the domain: "account" means three things | [domain-modeling](domain-modeling.md) |
| You do not yet know which module to reshape | improve-architecture, which surveys the repo or a pull request |
| You want the design argued with, not only named | [grill](grill.md) |

`ask-spp` routes between every skill when the right one is unclear.

## Deep modules

A module is **deep** when a lot of behaviour sits behind a small interface, and **shallow** when the interface is nearly as large as what it does. Depth is measured as leverage: how much a caller or a test gets for each thing it has to learn. The interface counts everything a caller must know, so invariants, call order and error modes count as much as the type signature.

The **deletion test** is the quick check. Imagine deleting the module: if its complexity disappears with it, it was a pass-through; if the complexity reappears in every caller, it was earning its place.

## The Depth check

Four questions, asked of every module a pull request adds or whose interface it changes:

1. Did it introduce shallowness?
2. Did it extract code only so it could be unit-tested?
3. Did it touch a module that was already shallow?
4. Do its tests reach past the interface?

The check reads each such module whole, with its direct callers and its tests. At a review gate a fired question becomes an Important or Minor finding, never Critical. In improve-architecture it becomes a deepening opportunity for you to explore. The questions live in one reference file inside this skill, so the gates and the survey cannot drift apart.

## Common questions

**I started it on its own and it began redesigning things I never asked about.**
It should answer in its terms and stop; it has no checkpoints because it is not a driver. To explore a design, run `/grill` or `/improve-architecture` and let them call this skill for the vocabulary.

**Is a deep module a folder layout?**
No. Depth is about the interface and how callers reach it, whatever the files look like. A tidy folder tree can still hold shallow modules, and one deep module can span several files.

**How do I stop code from reaching past an interface?**
The skill defines the shape; it does not enforce it. Common enforcement is a package boundary with a single entry file, or a dependency linter that forbids imports past that entry.

**Why does the Depth check run at the review gates?**
Because shallow modules found only after merging turn into a stream of refactor pull requests. One Epic's retro counted seven deepening candidates found in a survey afterwards and none at the slice gate, so the check now runs where the author is still in the file.

## It's working if

- Design discussions say "module", "interface" and "seam" instead of "component", "service" and "boundary".
- A proposed extraction comes with a deletion-test verdict nobody needs to hedge.
- A proposed seam names its second adapter, not only its first.
- Depth findings on your pull requests name the interface line and a concrete failure, and none is Critical.
