`spp claim <issue>` sets the Claim mark: it adds the `claimed` label, creating the label first when the repo lacks
it, and prints nothing. The Claim mark is a label and never an assignee (ADR 0006). `spp unclaim` removes it.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Adds the Claim mark to an issue.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The issue: a number in the current repo or a GitHub issue URL. |

#### Returns

`Promise`\<`number`\>

0 when the label is on the issue; 2 on a usage error, with the usage on stderr; 1 when `gh` fails, with
  the reason on stderr.

#### Example

```bash
spp claim 265
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp claim --help` prints.

```text
usage: spp claim <issue>
<issue> is an issue number in the current repo or a GitHub issue URL.
```
