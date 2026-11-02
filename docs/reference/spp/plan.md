# plan

`spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d] [--narrowed TEXT]... |
[--narrowed none] [--add-deviation TEXT] [--table-file FILE]` writes the Epic's `<!-- sdd-plan -->` comment,
rewriting it in place, and prints its URL. A field you do not pass keeps its stored value. `--narrowed` replaces the
stored list with every `--narrowed` of the call, `--narrowed none` clears it, and a call without it keeps it;
`--add-deviation` appends to the Deviated list. The table file is copied in verbatim. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Merges the given fields into the Epic's plan comment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), then any of the flags above. |

#### Returns

`Promise`\<`number`\>

0 when the comment is written; 2 on a usage error, with the usage on stderr; 1 when `gh` fails or the
  stored trailer does not decode, with the reason on stderr.

#### Example

```bash
spp plan 197 --branch feat/rebuild --add-deviation "#202: an unreadable trailer stops the write"
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp plan --help` prints.

```text
usage: spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d]
                       [--narrowed TEXT]... | [--narrowed none] [--add-deviation TEXT] [--table-file FILE]
--narrowed replaces the stored list with every --narrowed of the call, --narrowed none clears it, and a
call without --narrowed keeps it; --add-deviation appends.
```
