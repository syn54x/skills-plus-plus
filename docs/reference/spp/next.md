`spp next <epic> [--json]` prints the build's next actions, one per line. The build loop is: run `spp next`, do
what it says, run it again. It reads the Epic's preconditions, its state, CI on open pull requests, the gate's
verdict history, the pull request to the base branch and the session list, all from GitHub and `claude`, never
from local state. With `--json` it prints [NextActions](#nextactions).

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Prints the build's next actions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), and `--json` for the [NextActions](#nextactions) shape. |

#### Returns

`Promise`\<`number`\>

0 when it printed the actions, a failed precondition included (as a `preflight` action); 2 on a usage
  error, with the usage on stderr. A `gh` error exits 1 with the reason on stderr.

#### Example

```bash
spp next 197
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp next --help` prints.

```text
usage: spp next <epic number | issue URL> [--json]
Prints the next actions: preflight, branch, dispatch, gate, fix, hand-back, merge, wait, main-gate, close or stuck.
```

## Type Aliases

### NextActions

```ts
type NextActions = object;
```

The build's next actions: the `--json` shape of `spp next`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-actions"></a> `actions` | [`Action`](#action)[] | The actions, in the order to take them. |

***

### Driver

```ts
type Driver = "desktop" | "bg" | "subagent";
```

A Driver a worker can run in, as `spp plan --driver`, `spp dispatch --driver` and `spp next` name it.

***

### ActionKind

```ts
type ActionKind = 
  | "preflight"
  | "branch"
  | "dispatch"
  | "gate"
  | "fix"
  | "hand-back"
  | "merge"
  | "wait"
  | "main-gate"
  | "close"
  | "stuck";
```

What the build does next: fix a precondition, cut the branch, start workers, gate, fix, hand back, merge, wait, gate the pull request to the base branch, close the Epic, or stop as stuck.

***

### Action

```ts
type Action = object;
```

One next action of the build.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-kind"></a> `kind` | [`ActionKind`](#actionkind) | What to do. |
| <a id="property-tickets"></a> `tickets?` | `string`[] | The tickets it is about, for `dispatch`, `gate`, `fix`, `hand-back` and `merge`; a Fix pull request's is its Sub-issue, when attributed. |
| <a id="property-pr"></a> `pr?` | `string` | The pull request URL it is about. |
| <a id="property-driver"></a> `driver?` | [`Driver`](#driver) | How to start the workers, on `dispatch`. |
| <a id="property-panel"></a> `panel?` | `boolean` | On `main-gate`: whether the Epic is large enough for the review panel. |
| <a id="property-reason"></a> `reason` | `string` | Why, in a sentence. |
