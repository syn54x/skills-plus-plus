`spp feedback` works on Skill feedback: it checks a draft before anyone files it, and lists the Signals waiting to
become one.

It also acts on a pending candidate. `spp feedback file <fingerprint>` files it on the one grouped Skill feedback
issue for that skill step and category on syn54x/skills-plus-plus, and rewrites the person's own tally comment
there; under the person's Submission mode Review it first prints what it would post and files only when run again
with that text's `--confirm` hash. `spp feedback skip <fingerprint>` drops a candidate for good, and
`spp feedback submission [Auto|Review]` reads or sets the person's Submission mode.

The check and the list:

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

Checks a skill-feedback draft, lists, files or skips the pending candidates, or reads or sets the Submission mode.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not leak; `pending`, then `--json` for the [FeedbackCandidate](#feedbackcandidate) list; `file <fingerprint>` with `--epic <epic>` (whose repos' modes also bind), `--change <change>` (the Proposed change, default `unclear`), `--note <text>` and `--confirm <hash>`; `skip <fingerprint>`; or `submission`, then `Auto` or `Review` in any case to set it. |

#### Returns

`Promise`\<`number`\>

For `check`, one `rule <rule> <name>, line <n>: <text>` line per hit on stdout, in line order, with any
  secret in the text replaced by `[REDACTED]`. A hit that only warns (rules 1 to 6 under Full Detail) starts with
  `warning: `. Exit 0 when the draft is clean or has warnings only; 2 when any hit blocks (a secret in any mode, or
  rules 1 to 6 under Anonymous); 1 when the mode is Off or unset. For `pending`: 0, an absent log included, leaving
  out skipped fingerprints and filed ones with no later Signal.

  For `file`, stdout starts with one such line per hit on the issue body (when one would be created) and the tally
  comment, checked under the lowest Self-improvement mode of the checkout and the Epic's repos. Exit 0 when filed,
  last line `filed <fingerprint> <issue URL> created|existing`. Exit 3 under Review with nothing written: `title:
  <title>` and the issue body (or `issue: <issue URL>` when the group exists), a blank line, the tally comment, then
  `confirm: <hash>`; the same command with `--confirm <hash>` files that text, and a stale hash shows the new text.
  Submission mode Auto files at once, falling back to Review, with a line on stderr, when any of those repos is
  private. Exit 2 when the check blocks, nothing written. Exit 1 under `CI`, an Off mode, an unknown fingerprint
  or a failing `gh` call, with the reason on stderr and no decision recorded.

  For `skip`, `skipped <fingerprint>` and exit 0; 1 on an unknown fingerprint. For `submission`, `Submission mode:
  <mode>` and exit 0. Every form exits 1 on a usage error, with the usage on stderr.

#### Example

```bash
spp feedback check draft.md --title-file titles.txt
spp feedback pending --json
spp feedback file 3f2a9c1b7e4d --change "add a check"
spp feedback file 3f2a9c1b7e4d --change "add a check" --confirm 9b1c0d2e3f4a
spp feedback skip 3f2a9c1b7e4d
spp feedback submission auto
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp feedback --help` prints.

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
