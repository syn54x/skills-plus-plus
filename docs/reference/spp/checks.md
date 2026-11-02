# checks

`spp checks <pr | sha> [--json]` reads CI for a pull request (its checks), or for a commit given as 7 to 40 hex
characters (its check runs). It prints the result, followed by the failing or pending run names. The reading comes
from each run's bucket, never from `gh`'s exit code: pending is never a pass, a cancelled run counts as a failure,
and runs that all skip read as `none`. With `--json` it prints [Checks](#checks).

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Prints CI's reading for a pull request or a commit.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | A pull request number or URL, or a commit sha, and `--json` for the [Checks](#checks) shape. |

#### Returns

`Promise`\<`number`\>

0 whatever the reading (read it from the output); 2 on a usage error, with the usage on stderr. A `gh`
  error exits 1 with the reason on stderr.

#### Example

```bash
spp checks 264
spp checks 6aa253f --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp checks --help` prints.

```text
usage: spp checks <pr number | pr URL | commit sha> [--json]
```

## Type Aliases

### CheckRun

```ts
type CheckRun = object;
```

One CI run.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `string` | The run's name. |
| <a id="property-bucket"></a> `bucket` | `string` | `pass`, `fail`, `pending`, `skipping` or `cancel`, as `gh pr checks` buckets it. |

***

### Checks

```ts
type Checks = object;
```

CI's reading: the `--json` shape of `spp checks`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-result"></a> `result` | `"pass"` \| `"fail"` \| `"pending"` \| `"none"` | `fail` when any run failed or was cancelled, else `pending` when any has not passed, else `pass`; `none` when no run counts (skipped runs never do). |
| <a id="property-runs"></a> `runs` | [`CheckRun`](#checkrun)[] | Every run, skipped ones included. |
