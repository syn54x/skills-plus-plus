`spp wave` plans the next Wave, and records waves, their pull requests and the review panel's rounds on the
Epic's one `<!-- sdd-wave -->` comment.

Its forms:

- `spp wave plan <epic> [--max N] [--json]` runs the parallel safety check over the ready Sub-issues: Files owned
  that overlap in one repo, and Consumes and Produces pairs across repos. Work in flight (claimed, assigned or with
  its pull request open, until it merges) takes part too, so a ready ticket that overlaps it stays held. It prints
  the tickets that can run together (at most `--max`, default 4) and the held ones with why; with `--json` it
  prints [WavePlan](#waveplan). It writes nothing.
- `spp wave <epic> add --n N --tickets ... --workers ... --started ISO8601 --edges ...` records a Wave, replacing
  any wave with the same `--n`.
- `spp wave <epic> pr --ticket T --pr URL|#n` records a pull request on the last wave holding `--ticket`, in any
  of its forms: a number in the Epic's repo, `owner/repo#N` or the issue URL.
- `spp wave <epic> panel --round R --verdict V [--report URL] ...` records a review panel round, replacing the
  round with the same `--round`.

Waves and panel rounds are lists inside the comment's data trailer, so a retried call replaces its own entry and
never duplicates one. The writing forms print the comment's URL.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Plans the next Wave, or records a wave, a pull request or a panel round on the wave comment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `plan <epic>` with `--max N` and `--json` for the [WavePlan](#waveplan) shape; or the Epic (an issue number in the current repo or an issue URL), then `add`, `pr` or `panel` and that form's flags. |

#### Returns

`Promise`\<`number`\>

0 when the plan is printed or the comment written; 2 on a usage error (a `pr` for a ticket no wave holds
  included), with the usage on stderr; 1 when `gh` fails or the stored trailer does not decode, with the reason on
  stderr.

#### Example

```bash
spp wave plan 197 --max 3 --json
spp wave 197 add --n 1 --tickets 200,201 --workers w1,w2 --started 2026-11-02T09:00:00Z --edges none
spp wave 197 panel --round 1 --verdict MERGE --report https://github.com/syn54x/skills-plus-plus/pull/9
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp wave --help` prints.

```text
usage: spp wave plan <epic> [--max N] [--json]
       spp wave <epic> add  --n N --tickets 101,owner/repo#7 --workers w1,w2 --started ISO8601
                             --edges "104<103,owner/repo#7<101" | --edges none
       spp wave <epic> pr    --ticket 101|owner/repo#7 --pr URL|#n
       spp wave <epic> panel --round R --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE [--report URL]
                             [--severity critical=1,important=2,minor=3] [--persona name=count,...] [--dropped D]
wave plan prints the ready tickets that can run together (at most --max, default 4) and the held ones with why;
a ready ticket that overlaps work in flight (claimed, assigned or with its PR open) is held until that merges.
wave add replaces every wave with the same --n; wave panel replaces the entry with the same --round
(a round shown but never posted has no --report and renders unposted);
wave pr records the PR on the last wave whose tickets hold --ticket, in any of its forms (number, owner/repo#N, URL).
A wave ticket is a number, owner/repo#N or an issue URL, stored and rendered as given.
```

## Type Aliases

### WavePlan

```ts
type WavePlan = object;
```

The next Wave: the `--json` shape of `spp wave plan`. A ticket is its number, or `owner/repo#N` outside the Epic's repo.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-wave"></a> `wave` | `string`[] | The ready tickets that can run together, lower Layer and lower number first. |
| <a id="property-held"></a> `held` | `object`[] | The ready tickets left out, each with why: a shared path, a Consumes and Produces pair, no Files owned, or a full wave. |
