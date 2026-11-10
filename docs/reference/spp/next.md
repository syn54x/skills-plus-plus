`spp next <epic> [--json] [--resume] [--started <tickets>]` prints the build's next actions, one per line. The build loop is: run
`spp next`, do what it says, run it again. It reads the Epic's preconditions, its state, CI on open pull requests,
the gate's verdict history and the pull request to the base branch, all from GitHub, never from local state or a
session list. With `--json` it prints [NextActions](#nextactions).

With `--started`, the comma-separated tickets (numbers in the Epic's repo, `owner/repo#N` or issue URLs) whose
workers this session started and that have not reported back count as in flight while they are still ready: none
is dispatched again, and a ready ticket that overlaps one is held. Without it nothing is held that way, so a new
session, or a restart after `spp unclaim`, dispatches them.

With `--resume`, for the first call of a run, a Sub-issue that is claimed, has no open or merged pull request and
no assignee comes back as a `hand-back` action with the reason `worker lost`: the session that started its worker
is gone, so the user decides whether to hand it back or start a worker again. Without it such a Sub-issue is in
flight.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Prints the build's next actions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), `--json` for the [NextActions](#nextactions) shape, `--resume` to report each lost worker as a `hand-back`, and `--started` with the tickets whose workers this session started and that have not reported back. |

#### Returns

`Promise`\<`number`\>

0 when it printed the actions, a failed precondition included (as a `preflight` action); 2 on a usage
  error, with the usage on stderr. A `gh` error exits 1 with the reason on stderr.

#### Example

```bash
spp next 197
spp next 197 --resume --json
spp next 197 --json --started 201,202
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp next --help` prints.

```text
usage: spp next <epic number | issue URL> [--json] [--resume] [--started 101,owner/repo#7]
Prints the next actions: preflight, branch, dispatch, gate, fix, hand-back, merge, wait, main-gate, close or stuck.
--resume, on a run's first call, hands back each claimed Sub-issue with no pull request and no assignee as "worker lost".
--started names the tickets whose workers this session started and that have not reported back; while still ready,
they are in flight: not dispatched again, and a ready ticket that overlaps one is held.
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
| <a id="property-panel"></a> `panel?` | `boolean` | On `main-gate`: whether the Epic is large enough for the review panel. |
| <a id="property-reason"></a> `reason` | `string` | Why, in a sentence. |
