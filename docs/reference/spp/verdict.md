`spp verdict <pr> --ticket N --head SHA --spec pass|fail --quality pass|fail` records the slice gate's two verdicts
as the pull request's `<!-- spp-verdict -->` Marker comment, rewritten in place, and prints its URL. It writes only
while the pull request is still at `SHA`, because a verdict counts only on the head it was given on; when the head
has moved it writes nothing and the reviewer reviews the new head. The trailer's `by` records the write's maker:
review, or the skill and step `--by "<skill> <step>"` names. It has no `--json`.

A verdict with `--spec fail` or `--quality fail` also records a `fix-round` Signal, charged to the maker of the
ticket's progress comment (implement-issue when it names none). It records nothing under `CI`, outside an Attended session, or when the Self-improvement mode of this checkout, or of
another repo whose issue it is about, is Off. A Signal goes to this checkout's log, and a failure
while recording is one `signal not recorded:` line on stderr that leaves the exit code as it was.

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
                   [--by "<skill> <step>"]
Writes the verdict comment while the pull request is still at SHA (7 to 40 hex characters); exits 3 when it moved.
--by records the write as that skill's (default review), the rest of the value as its step.
```
