`spp branch <epic> [--from <base>]` creates the Epic's integration branch `feat/<slug>` from `origin/<base>`
(default `main`), pushes it, records it on the plan comment through `spp plan --branch`, and prints the branch name.
When the branch exists it switches to it, and writes the plan comment only when the comment does not already name
the branch, so a second run finishes whatever the first left undone. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Creates or switches to the Epic's integration branch and records it on the plan comment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), then `--from <base>` to cut from a branch other than `main`. |

#### Returns

`Promise`\<`number`\>

0 when the branch is in place and recorded; 2 on a usage error, with the usage on stderr; 1 when `git`
  or `gh` fails, with the reason on stderr.

#### Example

```bash
spp branch 197 --from next
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp branch --help` prints.

```text
usage: spp branch <epic number | issue URL> [--from <base>]
Creates feat/<slug> from origin/<base> (default main), pushes it and records it with spp plan --branch.
If the branch exists, switches to it; the plan is written only when it does not already name the branch.
```
