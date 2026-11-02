# unclaim

`spp unclaim <issue>` clears the Claim mark: it removes the `claimed` label and prints nothing. A worker that stops
without a pull request hands the ticket back with `spp hand-back` instead, which also records why.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Removes the Claim mark from an issue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The issue: a number in the current repo or a GitHub issue URL. |

#### Returns

`Promise`\<`number`\>

0 when the label is off the issue; 2 on a usage error, with the usage on stderr; 1 when `gh` fails, with
  the reason on stderr.

#### Example

```bash
spp unclaim 265
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp unclaim --help` prints.

```text
usage: spp unclaim <issue>
<issue> is an issue number in the current repo or a GitHub issue URL.
```
