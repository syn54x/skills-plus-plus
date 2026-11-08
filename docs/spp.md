`spp` is the command-line tool behind the skills. It computes and writes everything that has to come out the same on every run: which Sub-issues are ready, the order to merge them, CI state, the Marker comments, the Claim mark and the retro numbers. The skills call it for you; you call it yourself to look at an Epic or to script around one.

To see what an issue is, run `spp kind` with its number:

```bash
spp kind 227 --json
```

It prints the issue's kind and why. The kind is `epic`, `sub-issue` (a hardened slice of an Epic), `one-off` (a hardened issue with no Epic) or `raw`. Issue 227 is a Sub-issue of Epic 197:

```json
{
  "kind": "sub-issue",
  "reason": "carries the ticket contract and one size; Sub-issue of https://github.com/syn54x/skills-plus-plus/issues/197"
}
```

Without `--json` the same answer is one line, `sub-issue: carries the ticket contract and one size; Sub-issue of https://github.com/syn54x/skills-plus-plus/issues/197`.

## Install

Installing the plugin puts `spp` on the Bash tool's PATH in every Claude Code session; the commands are on the [install page](index.md#install). Outside Claude Code, the same tool is published to npm as `@syn54x/spp` and needs Node 22.18 or later.

## Conventions

- **Issues and pull requests.** An `<issue>` or `<epic>` is an issue number in the current repo or a GitHub issue URL; use the URL when the Epic spans repos. A `<pr>` is a pull request number or URL.
- **JSON.** A command that takes `--json` prints one pretty-printed JSON value on stdout instead of its text lines. Each command's reference page documents that value as a type.
- **Exit codes.** 0 is success and 2 is a usage error, with the usage on stderr. 1 is a failed check or a `gh` error, with the reason on stderr. A few commands give a code its own meaning, such as 3 for "do this again on fresh state"; their reference pages say so.
- **Help.** `spp --help` lists the commands and `spp --version` prints the version. `spp <command> --help` (or `-h`) prints that command's usage and exits 0.

Commands that write a Marker comment print the comment's URL. The comment formats, the data trailer and the Claim mark are recorded in ADR 0006 and ADR 0007 in the repository's `.agents/adr/`.

## Command reference

The [command reference](reference/spp/index.md) has a page per command: what it does, its arguments, its exit codes, an example, and the type of its `--json` output. The pages are generated from the TSDoc in `spp/src/commands/`, so they change only when the commands do.

| To | Run |
| --- | --- |
| Read an Epic | [`status`](reference/spp/status.md), [`next`](reference/spp/next.md), [`kind`](reference/spp/kind.md), [`preflight`](reference/spp/preflight.md), [`wave plan`](reference/spp/wave.md), [`checks`](reference/spp/checks.md), [`retro`](reference/spp/retro.md) |
| Start work | [`branch`](reference/spp/branch.md), [`brief`](reference/spp/brief.md), [`dispatch`](reference/spp/dispatch.md), [`wait`](reference/spp/wait.md) |
| Write Marker comments and the claim | [`claim`](reference/spp/claim.md), [`unclaim`](reference/spp/unclaim.md), [`progress`](reference/spp/progress.md), [`hand-back`](reference/spp/hand-back.md), [`plan`](reference/spp/plan.md), [`wave`](reference/spp/wave.md), [`upsert`](reference/spp/upsert.md), [`verdict`](reference/spp/verdict.md), [`note`](reference/spp/note.md) |
| Gate | [`lint ticket`](reference/spp/lint.md), [`verify`](reference/spp/verify.md), [`merge`](reference/spp/merge.md), [`findings merge`](reference/spp/findings.md), [`guard worktree`](reference/spp/guard.md), [`feedback check`](reference/spp/feedback.md) |
| Read a pull request's gate | [`gate`](reference/spp/gate.md) |
| Record and list Signals | [`signal`](reference/spp/signal.md), [`feedback pending`](reference/spp/feedback.md) |
