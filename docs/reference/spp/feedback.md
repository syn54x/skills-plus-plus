`spp feedback` works on Skill feedback: it checks a draft before anyone files it, and lists the Signals waiting to
become one.

`spp feedback checkpoint` offers the pending candidates between steps of an Attended session, printing them with the
steps an agent follows to file, skip or keep each one, and prints nothing on a worker's `sdd/` branch.

It also acts on a pending candidate. `spp feedback file <fingerprint>` files it on the one grouped Skill feedback
issue for that skill step and category on syn54x/skills-plus-plus, and rewrites the person's own tally comment
there; under the person's Submission mode Review for this repo it first prints what it would post and files only when run again
with that text's `--confirm` hash. `spp feedback skip <fingerprint>` drops a candidate for good, and
`spp feedback submission [Auto|Review]` reads or sets the person's Submission mode for this repo.

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

Checks a skill-feedback draft, lists, files or skips the pending candidates, offers them at a checkpoint, or reads
or sets the Submission mode.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `check`, the draft's body file, then `--title-file <file>` for the titles and repo names it must not leak; `pending`, then `--json` for the [FeedbackCandidate](#feedbackcandidate) list; `file <fingerprint>` with `--epic <epic>` (whose repos' modes also bind), `--change <change>` (the Proposed change, default `unclear`), `--note <text>` and `--confirm <hash>`; `skip <fingerprint>`; `submission`, then `Auto` or `Review` in any case to set it for this repo; or `checkpoint`, alone. |

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
  <title>` and the issue body (or `issue: <issue URL> (by <author>)` when the group exists), a blank line, the tally
  comment, then `confirm: <hash>`; the same command with `--confirm <hash>` files that text, and a stale hash shows
  the new text. Submission mode Auto files at once, falling back to Review, with a line on stderr, when any of those
  repos is private. Exit 2 when the check blocks, nothing written. Exit 1 under `CI`, outside an Attended session,
  in a worker's checkout, under an Off mode, on an unknown fingerprint or a failing `gh` call, with the reason on
  stderr and no decision recorded.

  The grouped issue is only ever one opened by the gh user or by an OWNER, MEMBER or COLLABORATOR of
  syn54x/skills-plus-plus (ADR 0009); a stranger's issue carrying the fingerprint is passed over. The person keeps
  one tally comment on it for each repo they file from, matched by a hash of the repo in its trailer.

  For `skip`, `skipped <fingerprint>` and exit 0; 1 on an unknown fingerprint, and in the cases `file` refuses before
  reading the fingerprint. For `submission`, `Submission mode: <mode>` and exit 0.

  For `checkpoint` with no other argument, exit 0 whatever happens. It prints nothing under `CI`, outside an Attended session, under Self-improvement
  mode Off, on a worker's `sdd/` branch or with nothing pending. Otherwise it prints `spp: <n> Skill feedback
  candidates pending for <owner/repo>:`, the candidates exactly as `pending` prints them, a blank line, then
  [CHECKPOINT\_STEPS](#checkpoint_steps). An error (a checkout with no origin remote) writes one `spp feedback checkpoint:
  <message>` line to stderr and still exits 0, so the `SessionStart` hook that runs it never fails.

  Every form exits 1 on a usage error, with the usage on stderr.

#### Example

```bash
spp feedback check draft.md --title-file titles.txt
spp feedback pending --json
spp feedback file 3f2a9c1b7e4d --change "add a check"
spp feedback file 3f2a9c1b7e4d --change "add a check" --confirm 9b1c0d2e3f4a
spp feedback skip 3f2a9c1b7e4d
spp feedback submission auto
spp feedback checkpoint
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp feedback --help` prints.

***

### CHECKPOINT\_STEPS

```ts
const CHECKPOINT_STEPS: "This is a checkpoint. For each candidate, run `spp feedback file <fingerprint>`, adding `--epic <epic>` when the work belongs to an Epic, and `--change <change>` and `--note <text>` when the evidence supports them. Its exit says what to do next:\n- 0: filed. Tell the person its last line.\n- 3: a preview. Show it whole and ask: file, skip or later. File: run the same command again with `--confirm <hash>`. Skip: run `spp feedback skip <fingerprint>`. Later: do nothing; it is offered at the next checkpoint.\n- 2: the outbound check blocked it. Redraft `--note` without the flagged text and run it once more; if it blocks again, leave it for later.\n- 1: tell the person the reason it printed and go on.\nDraft `--note` and `--change` from evidence only: a count, or the moment a step was followed and was wrong. The charge may move to an earlier step than the one named only with that evidence; the note names that step and the evidence.\nRun this between steps, never in the middle of one, and never from a worker.\n";
```

The steps `spp feedback checkpoint` prints after the pending candidates, for the agent at the checkpoint.

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
