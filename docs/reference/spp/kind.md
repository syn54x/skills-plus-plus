`spp kind <issue> [--json]` says what an issue is: an Epic (it has Sub-issues), a hardened Sub-issue (it passes
`spp lint ticket`, its Verify pin included, and has a parent Epic), a hardened One-off (it passes the lint and has
no Epic) or a raw issue (anything else, including one whose Verify block was never pinned or changed since), and why.
`/build` routes on it, sends a raw issue to `/triage` to be hardened again, and builds a Sub-issue through its
Epic, never as a One-off. Without
`--json` the answer is one line, such as `one-off: carries the ticket contract and one size`; with `--json` it prints
[Kind](#kind).

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Prints what an issue is.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The issue (a number in the current repo or a GitHub issue URL), and `--json` for the [Kind](#kind) shape. |

#### Returns

`Promise`\<`number`\>

0 when it printed the kind, `raw` included; 2 on a usage error, with the usage on stderr. A `gh` error
  exits 1 with the reason on stderr.

#### Example

```bash
spp kind 227 --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp kind --help` prints.

```text
usage: spp kind <issue number | issue URL> [--json]
```

## Type Aliases

### Kind

```ts
type Kind = object;
```

What an issue is: the `--json` shape of `spp kind`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-kind"></a> `kind` | `"epic"` \| `"sub-issue"` \| `"one-off"` \| `"raw"` | `epic` when it has Sub-issues; when it passes the ticket lint and its Verify block matches its pin, `sub-issue` if it has a parent Epic and `one-off` if it has none; `raw` otherwise. |
| <a id="property-rule"></a> `rule?` | `"pin-present"` \| `"pin-match"` | Present only on a `raw` issue that passes the lint but not the pin check: `pin-present` when its Verify block was never pinned, `pin-match` when it changed since. Such an issue was hardened and needs harden again, so `/review` refuses its pull request rather than review it as unlinked. |
| <a id="property-reason"></a> `reason` | `string` | Why: the Sub-issue count for an Epic, the parent's URL for a Sub-issue, and for a raw issue every lint failure, joined by `; `, or the detail of [Kind.rule](#property-rule) when the lint passes but the pin does not. |
