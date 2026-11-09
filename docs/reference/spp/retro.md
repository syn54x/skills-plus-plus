`spp retro <epic> [--json]` collects the Epic's retro numbers from GitHub alone: findings by Law tag and by
Sub-issue from the gate's verdicts, fix rounds, Hand-backs, the panel's rounds, and ponytail's hits. A pull request
is a Sub-issue's when GitHub links it or the wave comment's trailer records it. An input it cannot read is named on
stderr as `not found` and never counted as 0. With `--json` it prints [Retro](#retro); the field docs there say where
each number comes from.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Prints the Epic's retro numbers.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), and `--json` for the [Retro](#retro) shape. |

#### Returns

`Promise`\<`number`\>

0 when it printed the numbers, inputs it could not read included (they read `not found`); 2 on a usage
  error, with the usage on stderr. A `gh` error on the Epic itself exits 1 with the reason on stderr.

#### Example

```bash
spp retro 197 --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp retro --help` prints.

```text
usage: spp retro <epic number | issue URL> [--json]
Prints the Epic's retro numbers from GitHub: findings by Law tag and by ticket, fix rounds, the failed gates of
Fix pull requests, hand-backs, the panel's rounds (one per pull request and round) and findings, and ponytail's
hits, unique hits and overlap. A number whose input is missing reads "not found" (and, for the others, is named
on stderr), never 0.
```

## Type Aliases

### Retro

```ts
type Retro = object;
```

The Epic's retro numbers: the `--json` shape of `spp retro`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-bycause"></a> `byCause` | `Record`\<`string`, `number`\> | Findings in failing verdicts by Law tag, `none` for an untagged one. A verdict is a review or comment on a Sub-issue's pull request, or on a Fix pull request, with a `## Spec: FAIL` or `## Quality: FAIL` heading, and each of its finding lines (`- <severity> · [<source>#<id>] · <file:line at sha> · ...`) counts once under its whole tag. |
| <a id="property-byticket"></a> `byTicket` | `Record`\<`string`, `number`\> | The same findings by Sub-issue, `#N` or `owner/repo#N`. A Fix pull request's findings count under the Sub-issue its `Refs` line names; an unattributed fix adds none. |
| <a id="property-rounds"></a> `rounds` | `number` | Failing verdicts on the Sub-issues' pull requests, one per fix round; [Retro.fixPrRounds](#property-fixprrounds) counts the Fix pull requests' apart. |
| <a id="property-fixprrounds"></a> `fixPrRounds` | `number` \| `"not found"` | Failing verdicts on the Epic's Fix pull requests, found as `spp status` finds them (ADR 0011): a trusted pull request into the integration branch that closes no Sub-issue. A fix the wave comment's trailer also records for a Sub-issue is that Sub-issue's pull request and counts in [Retro.rounds](#property-rounds) only. `"not found"` when the plan comment records no integration branch, since fixes cannot be looked for without it. |
| <a id="property-handbacks"></a> `handBacks` | `number` | `labeled` events for `needs-info`, `ready-for-human` and `blocked` on the Sub-issues. |
| <a id="property-panel"></a> `panel` | \| \{ `rounds`: `number`; `findings`: `number`; \} \| `"not found"` | The panel rounds the wave comment's trailer records (`spp wave <epic> panel`), one per distinct pull request and round (a round recorded with no pull request counts by its round alone), and their findings. |
| <a id="property-ponytail"></a> `ponytail` | \| \{ `hits`: `number`; `unique`: `number`; `overlap`: `number`; \} \| `"not found"` | Ponytail's findings that stood after verification, from pull request comments that start `## Ponytail` with one `- <severity> · <file:line> · <title>` line per hit. A hit overlaps the gate when a verdict finding on the same pull request names the same file less than 5 lines away, and is unique otherwise. |
