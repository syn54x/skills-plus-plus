`spp preflight <epic> [--json]` checks the Epic's preconditions before a build, in order: `gh` 2.94 or later, the
Epic open, at least one Sub-issue, a plan comment, and a Routing block in `CLAUDE.md` or `AGENTS.md`. It prints
`ok: <check>` per passing check; at the first failure it prints `fail:` and `fix:` lines on stderr. With `--json`
a pass prints the parsed [Routing](#routing) block instead of the `ok:` lines.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Checks the Epic's preconditions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), and `--json` for the [Routing](#routing) shape. |

#### Returns

`Promise`\<`number`\>

0 when every check passes; 1 at the first that fails, with `fail:` and `fix:` on stderr, and on a `gh`
  error; 2 on a usage error, with the usage on stderr.

#### Example

```bash
spp preflight 197 --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp preflight --help` prints.

```text
usage: spp preflight <epic number | issue URL> [--json]
```

## Type Aliases

### SelfImprovementMode

```ts
type SelfImprovementMode = "Off" | "Anonymous" | "Full Detail";
```

The Self-improvement mode: the most a skill-feedback issue may say about the repo's work; under Off nothing is recorded or filed.

***

### Routing

```ts
type Routing = object;
```

A repo's Routing block, parsed: the `--json` shape of `spp preflight`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-mode"></a> `mode` | `"org"` \| `"labels-only"` | The `Mode:` line. |
| <a id="property-sizes"></a> `sizes` | `string` | The `Sizes:` line, as written. |
| <a id="property-laws"></a> `laws` | `string`[] | The documents on the `Laws:` line. |
| <a id="property-panel"></a> `panel` | `object` | When the main gate runs the review panel: at `tickets` Sub-issues or more, on any size L ticket when `sizeL`, or at `lines` changed lines or more. |
| `panel.tickets` | `number` | - |
| `panel.sizeL` | `boolean` | - |
| `panel.lines` | `number` | - |
| <a id="property-selfimprovement"></a> `selfImprovement` | [`SelfImprovementMode`](#selfimprovementmode) | The `Self-improvement mode:` line, else an old `Upstream feedback:` line migrated; a missing or unknown value is Off. |
| <a id="property-merge"></a> `merge?` | `"squash"` \| `"merge"` \| `"rebase"` | How `spp merge` merges a slice; absent means squash. |
