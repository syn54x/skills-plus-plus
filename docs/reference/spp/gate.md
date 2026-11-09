`spp gate <pr number | pr URL> [--json]` reads a pull request's slice gate the way `spp merge` does: the verdict
comment from a trusted author (ADR 0009), judged against the pull request's current head, or its merged head once
it merged. It prints `gate-pass <pr> head <sha7>: spec pass, quality pass`, `gate-fail <pr> head <sha7>: spec fail,
quality pass` (spec or quality failed), or `pr-open <pr> head <sha7>: no passing verdict on this head` when there is
no trusted verdict or it names an older head. With `--json` it prints `{ pr, head, state, verdict, by }`: `verdict`
is the Verdict or null, and `by` is the maker the verdict comment's trailer records, or null when it records none.
Every state exits 0, so a caller branches on the state.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Prints the gate state of one pull request.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The pull request (a number or URL), and `--json` for the `{ pr, head, state, verdict, by }` shape. |

#### Returns

`Promise`\<`number`\>

0 in every gate state; 1 on a `gh` error; 2 on a usage error, with the usage on stderr.

#### Example

```bash
spp gate https://github.com/acme/app/pull/40 --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp gate --help` prints.

```text
usage: spp gate <pr number | pr URL> [--json]
```
