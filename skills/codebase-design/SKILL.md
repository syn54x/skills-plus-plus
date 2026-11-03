---
name: codebase-design
description: Vocabulary and tests for deep modules. Use when designing or reshaping a module's interface, deciding where a seam goes, or making code easier to test or navigate.
---

Words and tests for talking about the shape of code. This skill is a reference: asked a design question, answer it in these terms and stop. It runs no process of its own; the skills that drive design work call it for the words.

## The words

Say the word in the first column; the third column lists what it replaces.

| Word | Means here | Instead of |
| --- | --- | --- |
| **Module** | Code that callers reach only through what it promises. Size is irrelevant: a single function and a whole service both qualify. | component, service, unit |
| **Interface** | Every promise and demand the module makes of its callers: the types, what must be true before a call, what holds after it, which call comes first, how it fails, and what it costs to run. | API, signature |
| **Implementation** | Everything behind those promises. | |
| **Depth** | What a module does for its callers set against what it makes them learn, counted in caller effort, never in lines of code. **Deep** means much done for little learned; **shallow** means the caller learns nearly as much as the module does. | |
| **Seam** | A point where what runs can be swapped without editing the code that calls it. Choosing where a seam sits is its own decision, apart from choosing what sits behind it. | boundary |
| **Adapter** | Whatever is plugged in at a seam. The word describes a job, not contents: an SMTP mailer and a test double that records sent mail both fill the mail seam. | |
| **Leverage** | What a caller gains from depth. | |
| **Locality** | What a maintainer gains from depth: a change, a fault or a test lands in one place. | |

## Tests to apply

- **Inline it in your head.** Picture the module's body pasted into each of its callers. If the callers barely grow, the module was an extra hop. If each would have to carry the same tangle, the module is paying for itself.
- **Tests are callers.** A test goes through the same interface every other caller uses. Needing to reach inside to test something means the interface is cut in the wrong place.
- **Count the adapters.** A seam with one adapter is a guess. Cut it once a second one is real, which is often the test double.
- **Design it twice.** For an interface that will be hard to change later, produce rival designs before committing to the first.
- **Depth is measured at the interface only.** A deep module may be assembled from many small parts with seams of their own, so long as callers never see them.

## When a module resists testing

Look first at where it gets its collaborators and what it hands back. A module that builds its own database client, or changes the object it was given instead of returning a value, makes every test set up the world. Pass collaborators in, hand back values a test can compare, and offer as few entry points as the callers need.

## Going further

- Checking a pull request, at a review gate or in a survey: read [`DEPTH-CHECK.md`](DEPTH-CHECK.md).
- Folding a cluster of shallow modules into one: read [`DEEPENING.md`](DEEPENING.md).
- Producing rival interfaces for one module: read [`DESIGN-IT-TWICE.md`](DESIGN-IT-TWICE.md).
