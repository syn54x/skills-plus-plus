`spp lint ticket <issue> [--json]` is the mechanical half of hardening. It checks the required sections, a fenced
Verify block, Files owned lines starting `Create`, `Modify` or `Test`, Test scenarios shaped
`<category>: ... → ...`, exactly one `size:` label, and no placeholder text. It prints `ok`, or one
`<rule>: <detail>` line per failure; with `--json` it prints [LintResult](#lintresult).

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Lints one ticket.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `ticket`, the issue (a number in the current repo or a GitHub issue URL), and `--json` for the [LintResult](#lintresult) shape. |

#### Returns

`Promise`\<`number`\>

0 when the ticket passes; 1 when it breaks a rule; 2 on a usage error, with the usage on stderr. A `gh`
  error also exits 1, with the reason on stderr.

#### Example

```bash
spp lint ticket 265
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp lint --help` prints.

```text
usage: spp lint ticket <issue number | issue URL> [--json]
```

## Type Aliases

### LintResult

```ts
type LintResult = object;
```

The lint's answer: the `--json` shape of `spp lint ticket`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-ok"></a> `ok` | `boolean` | Whether the ticket passes every rule. |
| <a id="property-failures"></a> `failures` | [`Failure`](#failure)[] | One entry per broken rule; empty when `ok`. |

***

### Failure

```ts
type Failure = object;
```

One ticket-lint rule a body breaks.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-rule"></a> `rule` | `string` | `section-present`, `verify-fenced`, `files-owned-shape`, `scenario-shape`, `one-size` or `no-placeholder`. |
| <a id="property-detail"></a> `detail` | `string` | What is wrong, in a sentence. |
