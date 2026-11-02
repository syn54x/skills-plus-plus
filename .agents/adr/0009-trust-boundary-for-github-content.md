# spp acts on GitHub content only from trusted authors, and pins the Verify block

`spp` acts mechanically on what it reads from GitHub: a verdict comment decides whether `spp merge` merges, the plan comment names the branch it merges into, a progress comment names the worker, and `spp verify` runs the Verify block's commands with `bash`. Until the panel on #267, it took the first **Marker comment** that started with the right marker, whoever wrote it, and ran the Verify block the issue body held at that moment. Anyone who can comment could then post a passing verdict before the reviewer did, and `spp merge` would merge an unreviewed slice; the reviewer's own write would fail, since GitHub refuses to let one user edit another's comment. Anyone who can edit an issue, which includes the outside reporter of a triaged bug, could swap a Verify line for `curl ... | sh` after the issue was approved, and the worker's `spp verify` would run it with the developer's credentials.

We draw one boundary. Comments and issue bodies are input that anyone may write; `spp` acts only on what a trusted author wrote, or on what a trusted author approved and pinned.

## Decisions

- **Whose Marker comments count.** `spp` reads a Marker comment (verdict, plan, progress, wave, or any other) only when its author is the current gh user or one GitHub marks `OWNER`, `MEMBER` or `COLLABORATOR` on the repository. Those three roles are people the repository's owners chose to let in, while anyone with a GitHub account can comment, so the line falls where a stranger's reach ends.
- **Skip, never stop.** An untrusted comment that starts with a marker is passed over as if it were plain text. The first trusted one is read and rewritten, and when there is none `spp` creates its own. A forged comment can therefore neither be read nor block the real writer.
- **Every reader applies it.** The snapshot query fetches each comment's author, its association and the gh user in the same request, so `parseSnapshot` and `derive` stay pure. `markers.find`, `spp next`'s verdict history and `spp retro`'s wave read apply the same rule. `spp merge` re-reads the verdict comment through `markers.find` before it merges, so the merge rests on a check of the comment itself and not only on the snapshot that preceded it.
- **The Verify block is pinned.** Hardening ends with `spp lint ticket <N> --pin`, which, when the lint passes, writes the sha256 of the Verify block into the progress comment's trailer as `verifyPin`. `spp verify` refuses to run, and records nothing, when the pin is missing or no longer matches the block, and tells the person to re-harden. The pin lives in a Marker comment, so the rule above protects it too. Triage pins after its own last edit to the body, because harden's pin would not match a block triage rewrote.
- **A run speaks for `HEAD` only on a clean tree.** `spp verify` refuses to run when `git status --porcelain` is non-empty, so a `verified` note always describes the committed tree it is attached to.

## Considered options

- Refuse a Verify block whose last editor lacks write access: needs the issue's edit history on every run, and a block edited by a trusted person after approval would still run unreviewed.
- Trust anyone who can comment and rely on review to notice forged comments: a forged verdict merges before anyone reads it.
- Pass the gh user's login into `parseSnapshot` as a separate argument: one more `gh` call in every command that reads a snapshot, when the same query can return it.

## Not covered

The reviewer in the `review` skill still runs the issue's Verify block by hand, and the epic board reads the wave comment from the raw snapshot without this rule. Both are outside `spp`'s mechanical path today; bringing them inside it is a later change.
