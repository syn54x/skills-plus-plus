# Deepening

How to deepen a cluster of shallow modules into one, given what the cluster depends on. Uses the vocabulary in [`SKILL.md`](SKILL.md).

## Sort the dependencies

Sort every dependency of the cluster into one of four kinds. The kind decides how the deepened module is tested across its seam.

| Kind | Examples | How to deepen and test |
| --- | --- | --- |
| In-process | Pure computation, in-memory state | Merge the modules and test through the new interface directly. No adapter. |
| Local stand-in | A database with an embedded or in-memory twin, a fake filesystem | Deepen when the stand-in exists, and run it in the tests. The seam stays internal. |
| Remote, owned | Your own services across a network | Put a port at the seam. Production gets a network adapter, tests an in-memory one, and the logic stays in one module. |
| Remote, third-party | A payment provider, a mail service | Inject the service as a port, and give the tests a mock adapter. |

## Seam discipline

- A port with one adapter is indirection. Add one only when a second adapter (usually the test one) is real.
- Keep internal seams internal. A deep module's own tests may use them; its interface does not expose them.

## Replace the tests, do not layer them

- Write the new tests at the deepened module's interface, asserting what a caller can observe.
- Delete the old unit tests of the shallow modules once the new ones cover the behaviour; keeping both doubles the cost of every change.
- A test that has to change when only the implementation changes is testing past the interface; rewrite it at the interface.
