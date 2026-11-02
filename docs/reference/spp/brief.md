`spp brief <issue> [--out FILE]` writes the worker brief for one Sub-issue and prints the file's path. The brief
holds the ticket body verbatim, the Laws sources from the Routing block, the branch mechanics (cut from the Epic's
integration branch, or from the default branch for a One-off) and the report format. Without `--out` the file goes
in a new temporary directory. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Writes the worker brief and prints its path.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Sub-issue (an issue number in the current repo or an issue URL), then `--out FILE` to choose the file. |

#### Returns

`Promise`\<`number`\>

0 when the brief is written; 2 on a usage error, with the usage on stderr; 1 with the reason on stderr
  when there is no Routing block, the Epic's plan comment names no integration branch, or `gh` fails.

#### Example

```bash
spp brief 265 --out /tmp/brief-265.md
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp brief --help` prints.

```text
usage: spp brief <issue number | issue URL> [--out FILE]
Writes the worker brief for the ticket (its body verbatim, the Laws sources, the branch mechanics, the report format)
and prints the file's path. Without --out the file is a new one in the temp directory.
```
