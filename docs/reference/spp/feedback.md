`spp feedback` works on Skill feedback: it checks a draft before anyone files it, and lists the Signals waiting to
become one.

Its two forms:

- `spp feedback check <body-file> [--title-file <file>]` is the outbound check on a skill-feedback draft, run before
  anyone files it. The Routing block's Self-improvement mode sets what the draft may say. A blocked draft prints one
  `rule <rule> <name>, line <n>: <text>` line per hit on stdout. It never rewrites the draft. The title file holds
  one title per line, and a line that is only `owner/repo` names a repo. It has no `--json`.
- `spp feedback pending [--json]` lists the current repo's Signal log grouped by fingerprint (one skill step and
  category), most Signals first: one `<fingerprint> <count> <skill> <step> <category>` line each, or with `--json`
  a [FeedbackCandidate](#feedbackcandidate) list. An absent log lists nothing.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Checks a skill-feedback draft against the repo's Self-improvement mode, or lists the pending candidates.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not leak; or `pending`, then `--json` for the [FeedbackCandidate](#feedbackcandidate) list. |

#### Returns

`Promise`\<`number`\>

For `check`, one `rule <rule> <name>, line <n>: <text>` line per hit on stdout, in line order, with any
  secret in the text replaced by `[REDACTED]`. A hit that only warns (rules 1 to 6 under Full Detail) starts with
  `warning: `. Exit 0 when the draft is clean or has warnings only; 2 when any hit blocks (a secret in any mode, or
  rules 1 to 6 under Anonymous); 1 when the mode is Off or unset. For `pending`: 0, an absent log included. 1 on a
  usage error (with the usage on stderr).

#### Example

```bash
spp feedback check draft.md --title-file titles.txt
spp feedback pending --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp feedback --help` prints.

```text
usage: spp feedback check <body-file> [--title-file <file>]
       spp feedback pending [--json]
```

## Type Aliases

### FeedbackCandidate

```ts
type FeedbackCandidate = object;
```

The Signals of one skill step and category, grouped: an entry of the `spp feedback pending --json` list.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-fingerprint"></a> `fingerprint` | `string` | The first 12 hex characters of the SHA-256 of `<skill>\n<step>\n<category>`. |
| <a id="property-skill"></a> `skill` | `string` | The skill the Signals are charged to. |
| <a id="property-step"></a> `step` | `string` | The step within the skill, or `""` when none was named. |
| <a id="property-category"></a> `category` | [`SignalCategory`](signal.md#signalcategory) | What was corrected. |
| <a id="property-count"></a> `count` | `number` | How many Signals the log holds for this fingerprint. |
| <a id="property-versions"></a> `versions` | `Record`\<`string`, `number`\> | The same count by the plugin version each Signal was charged to. |
| <a id="property-evidence"></a> `evidence` | `string`[] | Each Signal's evidence, oldest first. |
