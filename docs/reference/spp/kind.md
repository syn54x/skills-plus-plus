`spp kind <issue> [--json]` says what an issue is: an Epic (it has Sub-issues), a hardened Sub-issue (it passes
`spp lint ticket` and has a parent Epic), a hardened One-off (it passes the lint and has no Epic) or a raw issue
(anything else), and why. `/build` routes on it, and builds a Sub-issue through its Epic, never as a One-off. Without
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

0 when it printed the kind; 2 on a usage error, with the usage on stderr. A `gh` error exits 1 with the
  reason on stderr.

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
| <a id="property-kind"></a> `kind` | `"epic"` \| `"sub-issue"` \| `"one-off"` \| `"raw"` | `epic` when it has Sub-issues; when it passes the ticket lint, `sub-issue` if it has a parent Epic and `one-off` if it has none; `raw` otherwise. |
| <a id="property-reason"></a> `reason` | `string` | Why: the Sub-issue count for an Epic, the parent's URL for a Sub-issue, and every lint failure, joined by `; `, for a raw issue. |
