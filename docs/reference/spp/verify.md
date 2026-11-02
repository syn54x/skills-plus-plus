`spp verify` runs a Sub-issue's Verify block and records the result on `HEAD`, and as a stop hook it holds a worker
on an `sdd/*` branch until that record exists. It has no `--json`.

Its three forms:

- `spp verify <issue>` runs the Sub-issue's Verify block from the repository root, one command per line (a trailing
  backslash continues a line), prints `pass:` or `fail:` per command with the commands' own output on stderr, and
  records the result as a note under `refs/notes/sdd-verify` on `HEAD`. It runs only a block that matches the pin
  hardening wrote in the progress comment (`spp lint ticket <issue> --pin <body-file>`), since anyone who can edit
  the issue can change the block after it was approved (ADR 0009), and only on a clean tree, so the note speaks for
  `HEAD`.
- `spp verify <issue> --print` runs nothing: it fetches the issue once, checks the pin on that fetch and prints the
  pinned block's commands, one per line, as the first form would run them, or refuses as the first form does and
  prints nothing. A skill that runs the block by hand runs only what this printed, so the check and the run read the
  same bytes (ADR 0009). It needs no clean tree.
- `spp verify --check` is the `Stop` and `SubagentStop` hook. On an `sdd/*` branch it blocks the stop when the tree
  is dirty or `HEAD` has no passing (or `blocked`) note, unless `HEAD` adds nothing to an integration branch or the
  default branch; on any other branch it passes unchecked.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Runs a Sub-issue's Verify block, or checks that `HEAD` carries a passing run.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Sub-issue (an issue number in the current repo or an issue URL), then `--print` to print its pinned commands instead of running them; or `--check` alone. |

#### Returns

`Promise`\<`number`\>

With an issue: 0 when every command passed; 1 when any failed, the issue has no Verify block, the block
  is unpinned or differs from its pin, or the tree is dirty (those last three run nothing and record nothing). With
  `--print`: 0 when it printed the pinned commands; 1, printing nothing, when the block is missing, unpinned or
  differs from its pin. With `--check`: 0 to let the session stop, 2 to block it, with the reason on stderr. 2 on a
  usage error, with the usage on stderr.

#### Example

```bash
spp verify 265
spp verify 265 --print
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp verify --help` prints.

```text
usage: spp verify <issue number | issue URL> [--print]
       spp verify --check
The first runs the ticket's Verify block and records the result on HEAD; with --print it runs nothing and prints the
pinned block's commands. --check exits 2 on an sdd/* branch whose HEAD has no passing record or whose tree is dirty;
as a stop hook it reads the hook payload on stdin.
```
