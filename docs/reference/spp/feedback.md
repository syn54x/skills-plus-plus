# feedback

`spp feedback check <body-file> [--title-file <file>]` is the outbound check on a skill-feedback draft that
`/close-epic` proposes, run before anyone files it. The Routing block's `upstreamFeedback` profile sets what the
draft may say. A blocked draft prints one `rule <rule> <name>, line <n>: <text>` line per hit on stdout. It never
rewrites the draft. The title file holds one title per line, and a line that is only `owner/repo` names a repo.
It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Checks a skill-feedback draft against the repo's upstream feedback profile.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not leak. |

#### Returns

`Promise`\<`number`\>

0 with no output when the draft is clean; 2 when it is blocked, one line per hit on stdout; 1 when the
  profile is off or unset, and on a usage error (with the usage on stderr).

#### Example

```bash
spp feedback check draft.md --title-file titles.txt
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp feedback --help` prints.

```text
usage: spp feedback check <body-file> [--title-file <file>]
```
