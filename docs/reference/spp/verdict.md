# verdict

`spp verdict <pr> --ticket N --head SHA --spec pass|fail --quality pass|fail` records the slice gate's two verdicts
as the pull request's `<!-- spp-verdict -->` Marker comment, rewritten in place, and prints its URL. It writes only
while the pull request is still at `SHA`, because a verdict counts only on the head it was given on; when the head
has moved it writes nothing and the reviewer reviews the new head. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Writes the gate's verdict comment on a pull request.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The pull request (a number or URL), `--ticket N`, `--head SHA` (7 to 40 hex characters), and `--spec` and `--quality`, each `pass` or `fail`. |

#### Returns

`Promise`\<`number`\>

0 when the comment is written; 3 when the head moved, with the current head on stderr; 2 on a usage
  error, with the usage on stderr; 1 when `gh` fails, with the reason on stderr.

#### Example

```bash
spp verdict 270 --ticket 265 --head abc1234 --spec pass --quality fail
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp verdict --help` prints.

```text
usage: spp verdict <pr number | pr URL> --ticket N --head SHA --spec pass|fail --quality pass|fail
Writes the verdict comment while the pull request is still at SHA (7 to 40 hex characters); exits 3 when it moved.
```
