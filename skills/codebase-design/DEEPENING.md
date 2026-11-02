# Deepening

How to fold a cluster of shallow modules into one deep module without losing the ability to test it. Uses the words in [`SKILL.md`](SKILL.md).

## Choose the test strategy by what the cluster reaches

Walk these questions in order and take the first that applies:

1. **Does the cluster reach nothing outside the process?** (calculation, in-memory state) Merge it, and test the merged module by calling its interface. No adapter is needed.
2. **Does it reach something that has a faithful local twin?** (a message broker with an embedded mode, a search index that can be built in memory) Merge it and run the twin inside the tests. The seam stays inside the module, and its interface shows no port.
3. **Does it reach a service your team runs?** (another of your own services over HTTP or a queue) Give the module a port where the network starts. Production plugs in a network adapter and tests plug in an in-memory one, while the logic stays in one place.
4. **Does it reach a service someone else runs?** (an SMS gateway, a tax-rate provider) Hand the service in as a port, and plug a scripted double into it in the tests.

## Keep seams honest

- Add a port only when it will have two adapters from the start. A port with one adapter is a detour with a name.
- A seam the module uses for its own tests stays out of its interface.

## Move the tests

Write the new tests against the merged module's interface, asserting only what a caller could observe. Once they cover the behaviour, delete the old tests of the shallow parts: a suite that tests both levels has to be edited twice for every change. A test that breaks when only the inside changes was written against the inside, so rewrite it against the interface.
