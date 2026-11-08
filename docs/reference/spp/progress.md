`spp progress <issue> [--status S] [--worker TEXT] [--branch NAME] [--pr N|URL] [--verify V] [--notes TEXT]
[--by "<skill> <step>"]` writes the Sub-issue's one `<!-- sdd-progress -->` comment, rewriting it in place, and prints its URL. A field you do not
pass keeps its stored value. The comment's data trailer holds the fields (ADR 0007); a trailer that does not decode
stops the write rather than erase the state. The trailer's `by` records the write's maker: implement-issue, or the
skill and step `--by` names. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Merges the given fields into the Sub-issue's progress comment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The issue (a number in the current repo or a GitHub issue URL), then any of `--status` (`in-progress`, `pr-open`, `verify-passed`, `changes-requested` or `handed-back`), `--worker`, `--branch`, `--pr`, `--verify` (`"not-run"`, `"passed <sha7>"` or `"failed <sha7>"`), `--notes` and `--by "<skill> <step>"`. |

#### Returns

`Promise`\<`number`\>

0 when the comment is written; 2 on a usage error, with the usage on stderr; 1 when the stored trailer
  does not decode or `gh` fails, with the reason on stderr.

#### Example

```bash
spp progress 265 --status pr-open --pr 270 --verify "passed abc1234"
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp progress --help` prints.

```text
usage: spp progress <issue> [--status in-progress|pr-open|verify-passed|changes-requested|handed-back]
                           [--worker TEXT] [--branch NAME] [--pr N|URL]
                           [--verify "not-run" | "passed <sha7>" | "failed <sha7>"] [--notes TEXT]
                           [--by "<skill> <step>"]
<issue> is an issue number in the current repo or a GitHub issue URL. A field not passed keeps its value.
--by records the write as that skill's (default implement-issue), the rest of the value as its step.
```
