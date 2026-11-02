`spp verify` runs a Sub-issue's Verify block and records the result on `HEAD`, and as a stop hook it holds a worker
on an `sdd/*` branch until that record exists. It has no `--json`.

Its two forms:

- `spp verify <issue>` runs the Sub-issue's Verify block from the repository root, one command per line (a trailing
  backslash continues a line), prints `pass:` or `fail:` per command with the commands' own output on stderr, and
  records the result as a note under `refs/notes/sdd-verify` on `HEAD`.
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
| `args` | `string`[] | The Sub-issue (an issue number in the current repo or an issue URL), or `--check` alone. |

#### Returns

`Promise`\<`number`\>

With an issue: 0 when every command passed, 1 when any failed (or the issue has no Verify block). With
  `--check`: 0 to let the session stop, 2 to block it, with the reason on stderr. 2 on a usage error, with the
  usage on stderr.

#### Example

```bash
spp verify 265
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp verify --help` prints.

```text
usage: spp verify <issue number | issue URL>
       spp verify --check
The first runs the ticket's Verify block and records the result on HEAD. --check exits 2 on an sdd/* branch whose
HEAD has no passing record or whose tree is dirty; as a stop hook it reads the hook payload on stdin.
```
