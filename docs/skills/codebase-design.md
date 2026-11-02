## What it does

`codebase-design` gives spp one set of words for the shape of code (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and retires the loose words they replace, such as component, service, API and boundary. It adds a few tests that follow from those words, and the **Depth check** that both review gates run on pull requests.

It only supplies words and tests. It asks you nothing, writes no files and begins no work on its own. Started directly, it answers the design question you put to it in these terms and stops; grill, review and improve-architecture call it when they need the words.

## When to reach for it

Type `/codebase-design`, or the agent starts it when a task fits: designing or reshaping a module's interface, placing a seam, making code easier to test, judging whether an extraction pays for itself, or running the Depth check during a review.

| What is wrong | Use |
| --- | --- |
| How a single module is cut: what callers see, where it can be swapped, how much it hides | `codebase-design` |
| A word of the domain means different things to different people | [domain-modeling](domain-modeling.md) |
| You do not know yet which module needs work | improve-architecture, which surveys a repo or a pull request |
| You want the design challenged question by question | [grill](grill.md) |

`ask-spp` routes between every skill when the right one is unclear.

## Deep modules

A **deep** module does a great deal for its callers while asking them to learn very little; a **shallow** one asks them to learn nearly as much as it does. What callers must learn is the whole interface: the types, but also what must hold before a call, what holds after, the order calls come in, and how things fail.

One quick test is to picture the module's body pasted into each caller. If the callers barely change, the module was an extra hop. If every caller would have to carry the same tangle, the module is pulling its weight.

## The Depth check

When a pull request creates a module or changes a module's interface, a review asks four questions about it:

1. Did the pull request introduce shallowness?
2. Was code pulled out only so it could be unit-tested?
3. Was the module already shallow before this change touched it?
4. Do the new tests reach past the interface?

To answer them the reviewer reads each such module in full, along with its direct callers and its tests. At a review gate, a question that fires becomes an Important or a Minor finding and never a Critical one. In improve-architecture it becomes a deepening opportunity for you to explore. All three readers take the questions from one file inside this skill, so they cannot drift apart.

## Common questions

**I started it by itself and it set about redesigning things I had not asked about.**
It should answer your question and stop, since it has no checkpoints of its own. To explore a design, run `/grill` or `/improve-architecture`, and they will call this skill for the words.

**Is a deep module a particular folder structure?**
No. Depth is about what callers must learn and how they reach the module, whatever the files look like. A neat folder tree can hide shallow modules, and one deep module can span many files.

**How do I keep code from going around an interface?**
This skill names the shape and leaves enforcement to tooling. Teams commonly use a package with a single entry file, or a dependency linter that rejects imports past that entry.

**Why do the review gates run the Depth check?**
Shallow modules found after merge come back as a trickle of refactoring pull requests. In one Epic, a survey after the fact found seven candidates the slice gate had not raised, so the check now runs while the author still has the file open.

## It's working if

- Design talk uses "module", "interface" and "seam" where it used to say "component", "service" and "boundary".
- Anyone proposing an extraction can say plainly whether it survives the paste-it-into-the-callers test.
- A proposed seam comes with its second adapter named.
- Depth findings on your pull requests point at the line declaring the interface, name a concrete failure, and are never Critical.
