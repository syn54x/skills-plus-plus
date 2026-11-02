---
name: codebase-design
description: The vocabulary and checks for designing deep modules, with small interfaces over a lot of behaviour at a clean seam. Use when designing or reshaping a module's interface, deciding where a seam goes, making code easier to test or navigate, judging whether an extraction pays for itself, when a review runs the Depth check on a pull request, or when another skill needs the deep-module words.
---

A reference, not a process: it gives the words and the checks for talking about a module's shape and starts no work of its own. Asked a design question, answer it in these terms and stop. Use the terms exactly; the substitutes listed under each are what they replace.

## Vocabulary

**Module**: anything with an interface and an implementation, at any scale: a function, a class, a package, a slice through several tiers. _Avoid_: component, service, unit.

**Interface**: everything a caller has to know to use the module correctly. The type signature is part of it; so are its invariants, the order calls must come in, its error modes, the configuration it needs and how it performs. _Avoid_: API, signature (both name only the typed part).

**Implementation**: the code inside the module.

**Depth**: how much behaviour a caller or a test gets per unit of interface it has to learn. A **deep** module hides a lot behind a little; a **shallow** one has an interface nearly as large as what it does. Depth is never a ratio of lines, which rewards padding.

**Seam**: a place where behaviour can be changed without editing the code at that place; the location an interface sits at. Where a seam goes is a decision of its own, separate from what goes behind it. _Avoid_: boundary.

**Adapter**: a concrete thing that fills an interface at a seam. The word names the role, so a Postgres repository and an in-memory fake are both adapters.

**Leverage**: what callers gain from depth: more capability for each thing they learn.

**Locality**: what maintainers gain from depth: a change, a bug or a test concentrates in one place, so one fix reaches every caller.

## Principles

- **Depth belongs to the interface.** A deep module may be built from many small parts with seams of their own; those internal seams serve its own tests and never surface in the interface.
- **The deletion test.** Imagine deleting the module. If its complexity disappears with it, it was a pass-through. If the complexity reappears in every caller, the module was earning its place.
- **The interface is the test surface.** Tests cross the same seam callers do. A test that needs to reach past the interface is a sign the module has the wrong shape.
- **One adapter is a hypothetical seam; two make it real.** Cut a seam only where something actually varies across it, usually production and test.
- **Design it twice.** The first interface that comes to mind is rarely the best. Before settling one that matters, produce rival designs and compare them.

## Shaping an interface

Ask of every interface being designed: can it have fewer entry points, simpler parameters, more hidden behind it? Then make it easy to test:

- Take dependencies as arguments rather than constructing them inside.
- Return results rather than mutating what was passed in.
- Keep the surface small: each entry point is a test to write and a fact for callers to learn.

## Going further

- Checking a pull request, at a review gate or in a survey: read [`DEPTH-CHECK.md`](DEPTH-CHECK.md) for the four questions, the reading rule and how a fired question is reported.
- Deepening a cluster of shallow modules: read [`DEEPENING.md`](DEEPENING.md) for how each kind of dependency is tested across the new seam.
- Producing rival interfaces for one module: read [`DESIGN-IT-TWICE.md`](DESIGN-IT-TWICE.md).
