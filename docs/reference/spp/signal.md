`spp signal <category> --by "<skill> [step]" --evidence "<text>" [--maker-version <v>]` records one Signal, a
correction only judgment can see, in the repo's Signal log beside the notes log. The Signal is charged to the skill
step named by `--by` and to the plugin version in `--maker-version`, or to the current plugin version without it.
It records nothing under `CI`, outside an Attended session, or when the Routing block's Self-improvement mode is Off,
and says why. The repo is the current checkout's origin. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Records one Signal for the current repo.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The category, then `--by` with the skill and an optional step, `--evidence` with what showed the correction, and optionally `--maker-version`. |

#### Returns

`Promise`\<`number`\>

0 when the Signal is recorded, printing `recorded <category> <skill> <step> <fingerprint>`, and 0 when it
  is not, printing `not recorded: <reason>`; 2 on a usage error, with the usage on stderr; 1 when it should be
  recorded but cannot be (the checkout has no GitHub origin, or the log cannot be written), with
  `spp signal: <reason>` on stderr.

#### Example

```bash
spp signal step-unclear --by "harden 3" --evidence "Verify named a missing script"
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp signal --help` prints.

***

### SIGNAL\_CATEGORIES

```ts
const SIGNAL_CATEGORIES: readonly ["verify-unrunnable", "contract-gap", "missed-edge", "undeclared-deviation", "brief-gap", "fix-round", "law-told", "law-not-told", "human-needed", "panel-noise", "panel-gap", "hook-wrong", "driver-failed", "step-unclear", "other", "fix-regression", "contract-edited", "wish", "escaped-defect"];
```

The categories a Signal may carry: the 15 of `skills/close-epic/FEEDBACK.md`, then the four the Signal sources add.

## Type Aliases

### SignalCategory

```ts
type SignalCategory = typeof SIGNAL_CATEGORIES[number];
```

What a Signal says was corrected: one of the categories `spp signal --help` lists.
