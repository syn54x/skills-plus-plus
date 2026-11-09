`spp findings merge <file...> [--json] [--verdict <round> ...] [--fix-diff <file>]` merges the review panel's Persona findings. Each
file is one [PersonaFindings](#personafindings). Findings under 80 confidence are dropped. The rest merge in two passes per file:
findings with the same normalised title, less than 5 lines from the first of them, form a title cluster; then title
clusters whose first lines are less than 5 lines from the first line of the group they join fold into one finding
whatever their titles, so a defect that several Personas word differently counts once. A title cluster is never
split. The merged finding keeps the highest severity and every Persona, and its body ends with one
`Also reported as: <title> (<Persona>, line <line>)` line for each other title. Its Law tag is the speaking
finding's when that cites one. A tagged title (`ticket-mandated:`, `Candidate ADR:`, `Check after deploy:` or
`Terminology`) merges only with its own tag.
`--verdict` adds the panel's verdict over the merged list, as a last `Verdict:` line or, with `--json`, a `verdict`
key; from round 3 a FIX FIRST is written HUMAN DECISION. With `--json` it prints [PanelFindings](#panelfindings).
`--fix-diff` names the patch of the fixes the round reviewed: each merged finding with any of its findings on a line
that patch added or changed, and not merged with a `recheck-` file's finding, records a `fix-regression` Signal (the Signal gates apply),
and a line on stderr says whether it was recorded. Each merge with `--fix-diff` also records one run of
`implement-issue` step `fix round`, which is what the fix-regression rate is counted over. The run is named by the
patch's content, `fix diff <hash>` (the first 12 hex characters of its SHA-256), after `pull request <N>` when the
patch sits in the panel's `spp-panel-<N>` folder, so merging the same round again records no second run. stdout, the `--json` shape and the exit code do not change.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Merges Persona findings files and, with `--verdict`, gives the panel's verdict.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `merge`, one or more findings files, `--json` for the [PanelFindings](#panelfindings) shape, and for a verdict `--verdict <round>` with `--spec pass\|fail`, `--coherence pass\|fail`, `--verify pass\|fail`, `--checks pass\|fail\|pending\|none` and optionally `--missing name,name` (Personas that never reported). Apart from those, `--fix-diff <file>` records fix regressions as described above. |

#### Returns

`Promise`\<`number`\>

0 when it printed the merged list; 2 on a usage error, with the usage on stderr; 1 when a file cannot be
  read (the `--fix-diff` patch included) or does not hold Persona findings, with the reason on stderr.

#### Example

```bash
spp findings merge correctness.json security.json --json
spp findings merge *.json --verdict 1 --spec pass --coherence pass --verify pass --checks pass
spp findings merge "$ROUND_DIR"/*.json --fix-diff "$PANEL_DIR/fix-2.patch"
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp findings --help` prints.

```text
usage: spp findings merge <file...> [--json] [--fix-diff <file>]
         [--verdict <round> --spec pass|fail --coherence pass|fail --verify pass|fail
          --checks pass|fail|pending|none [--missing name,name]]
Each file is { "persona": NAME, "findings": [{ file, line, title, severity, confidence, law?, body }] }.
Findings under 80 confidence are dropped. On one file, findings with the same normalised title merge within 5 lines of
the first of them; then those title groups merge whatever their titles when a group's first line is within 5 lines of
the first line of the merged group. The result keeps the highest severity and every persona, with an
"Also reported as: <title> (<persona>, line <line>)" line in the body for each other title. A title that starts
ticket-mandated:, Candidate ADR:, Check after deploy: or Terminology merges only with findings that start the same
way. --json prints { findings, counts: { severity, persona } }.
--verdict adds the panel's verdict (MERGE, FIX FIRST or HUMAN DECISION) as a last "Verdict:" line, or a "verdict"
key with --json. <round> is 1 for the first panel; from round 3 a FIX FIRST is written HUMAN DECISION. The other
flags are the readings the verdict also depends on; --missing names Personas that never reported.
--fix-diff <file> is the patch of the fixes made since the previous round. A merged finding with any of its findings
on a line it added or changed, and not merged with a finding from a recheck-* file, records a fix-regression Signal; stderr gets one
"fix-regression <id> recorded" or "fix-regression <id> not recorded: <reason>" line per such finding.
```

## Type Aliases

### PanelFindings

```ts
type PanelFindings = object;
```

The panel's findings after the merge: the `--json` shape of `spp findings merge`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-findings"></a> `findings` | [`Merged`](#merged)[] | The merged findings, most severe first, then by file and line; the ids follow this order. |
| <a id="property-counts"></a> `counts` | `object` | How many merged findings carry each severity, and how many name each Persona. |
| `counts.severity` | `Record`\<`string`, `number`\> | - |
| `counts.persona` | `Record`\<`string`, `number`\> | - |
| <a id="property-verdict"></a> `verdict?` | [`PanelVerdict`](#panelverdict) | The panel's verdict, present only with `--verdict`. |

***

### Severity

```ts
type Severity = "critical" | "important" | "minor";
```

How much a finding matters.

***

### Finding

```ts
type Finding = object;
```

One finding as a Persona reports it.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-file"></a> `file` | `string` | The file it is about. |
| <a id="property-line"></a> `line` | `number` | The line in that file. |
| <a id="property-title"></a> `title` | `string` | A one-line title. |
| <a id="property-severity"></a> `severity` | [`Severity`](#severity) | How much it matters. |
| <a id="property-confidence"></a> `confidence` | `number` | 0 to 100; under 80 the finding is dropped. |
| <a id="property-law"></a> `law?` | `string` | The Law tag it cites, if any. |
| <a id="property-body"></a> `body` | `string` | The finding's text. |

***

### PersonaFindings

```ts
type PersonaFindings = object;
```

One Persona's findings file, the input of `spp findings merge`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-persona"></a> `persona` | `string` | The Persona's name. |
| <a id="property-findings-1"></a> `findings` | [`Finding`](#finding)[] | Everything it found. |

***

### Merged

```ts
type Merged = object;
```

A finding after the merge, standing for every Persona finding it absorbed.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | `F1`, `F2` and so on, in the merged list's order: most severe first, then by file and line. |
| <a id="property-file-1"></a> `file` | `string` | The file it is about. |
| <a id="property-line-1"></a> `line` | `number` | The line in that file. |
| <a id="property-title-1"></a> `title` | `string` | A one-line title. |
| <a id="property-severity-1"></a> `severity` | [`Severity`](#severity) | The highest severity among the findings merged into it. |
| <a id="property-personas"></a> `personas` | `string`[] | Every Persona that reported it. |
| <a id="property-law-1"></a> `law?` | `string` | The Law tag it cites, if any. |
| <a id="property-body-1"></a> `body` | `string` | The finding's text. |

***

### PanelVerdict

```ts
type PanelVerdict = "MERGE" | "FIX FIRST" | "HUMAN DECISION";
```

The panel's verdict: FIX FIRST when a reading failed, a Persona never reported or a critical finding that is not
ticket-mandated stands (HUMAN DECISION from round 3 on); else HUMAN DECISION when an important finding stands, the checks are pending or a
finding is ticket-mandated; else MERGE.
