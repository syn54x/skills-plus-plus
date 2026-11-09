`spp lint ticket <issue>` is the mechanical half of hardening, and `spp lint pr <pr>` is the worker's check of its pull
request body before it reports. Each prints `ok`, or one `<rule>: <detail>` line per failure, and exits 1 on a failure.

`spp lint ticket <issue> [--pin <body-file> [--by "<skill> <step>"]] [--json]` is the mechanical half of hardening. It checks the required
sections, a fenced Verify block, Files owned lines starting `Create`, `Modify` or `Test`, Test scenarios shaped
`<category>: ... → ...`, exactly one `size:` label, and no placeholder text. It prints `ok`, or one
`<rule>: <detail>` line per failure; with `--json` it prints [LintResult](#lintresult). With `--pin <body-file>`, the file
the agent just wrote to the issue, a passing ticket's Verify block is pinned: the sha256 of the file's block goes
into the progress comment's trailer, and `spp verify` refuses to run a block that no longer matches it (ADR 0009).
The trailer's `verifyPinBy` and `by` record the pin's maker: harden, or the skill and step `--by "<skill> <step>"`
names (triage passes `--by "triage re-pin"`); later progress writes keep `verifyPinBy`.
The pin is taken from the file and not from the issue, so an edit made after the agent wrote the body is never
approved by it: when the issue's block differs from the file's, nothing is pinned and the lint fails with
`pin-match`. Hardening's last step is this run. Without `--pin`, as the ready gate and the worker's readiness check
run it, the issue's Verify block must carry a pin from a trusted progress comment, or the lint fails with
`pin-present`, and must still match that pin, or it fails with `pin-match`. So a ticket never hardened, or edited
after hardening, never reaches `ready-for-agent`, and a worker stops before running its block by hand.

A `pin-match` without `--pin` also records a `contract-edited` Signal, charged to the maker of the Verify pin
(harden when it names none), when the issue body's last editor is trusted (ADR 0009); with `--pin` it records none.
It records nothing under `CI`, outside an Attended session, or when the Self-improvement mode of this checkout, or of
another repo whose issue it is about, is Off. A Signal goes to this checkout's log, and a failure
while recording is one `signal not recorded:` line on stderr that leaves the exit code as it was.

`spp lint pr <pr number | pr URL> [--json]` is the worker's check of its pull request body before it reports. It reads
the pull request with `gh pr view <pr> --json body,headRefOid` and checks the form of the sections the review gate
looks for, ignoring fenced blocks and HTML comments, since a body may quote the template. `link`: the first line is
`Closes #<N>` (or `Fixes`, `Resolves`), or some line reads `Refs #<N>`, `Refs owner/repo#<N>` or `Refs <issue URL>`
(a Fix pull request). `section-present`: `## Ticket` and `## Laws` are there and not empty. `ticket-na`: no
`## Ticket` line reads `n/a`. `verify-sha`: a line that mentions Verify names a 7 to 40 character SHA the head
starts with, so a Verify line left on an older head after a fix round fails. `verify-corrected`: exactly one
`Verify block corrected:` line, whose value is `no` or `yes:` followed by text, so `none` fails. `interfaces`: an
`Interfaces changed:` line. It prints `ok`, or one `<rule>: <detail>` line per failure, like `lint ticket`; with
`--json` it prints [LintResult](#lintresult). It never judges whether a claim is true: the gate keeps that, and its own
finding for a body that still lacks a section.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Lints one ticket, or with `pr` one pull request body.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `pr` and the pull request (a number in the current repo or a GitHub pull request URL), with `--json` for the [LintResult](#lintresult) shape; or `ticket`, the issue (a number in the current repo or a GitHub issue URL), `--pin <body-file>` to pin a passing ticket's Verify block as the file holds it, with `--by "<skill> <step>"` to name the pin's maker, and `--json` for the [LintResult](#lintresult) shape. |

#### Returns

`Promise`\<`number`\>

0 when the ticket passes (and, with `--pin`, its pin is written); 1 when it breaks a rule, including
  `pin-match` when the issue's Verify block differs from the file's (which pins nothing) or, without `--pin`, from
  the pin already written, and `pin-present` when, without `--pin`, a Verify block has no pin; 2 on a usage error,
  with the usage on stderr. A `gh` error or an unreadable body file also exits 1, with the reason on stderr.
  `pr` exits 0 when the body passes every rule, 1 when it breaks one or `gh` fails, and 2 on a usage error (no pull
  request, an issue URL, extra arguments).

#### Example

```bash
spp lint ticket 265 --pin /tmp/harden-265.md
spp lint pr 40
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp lint --help` prints.

```text
usage: spp lint ticket <issue number | issue URL> [--pin <body-file> [--by "<skill> <step>"]] [--json]
       spp lint pr <pr number | pr URL> [--json]
--by records the pin as that skill's (default harden), the rest of the value as its step; it goes only with --pin.
```

## Type Aliases

### LintResult

```ts
type LintResult = object;
```

The lint's answer: the `--json` shape of `spp lint ticket` and `spp lint pr`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-ok"></a> `ok` | `boolean` | Whether the ticket or the pull request body passes every rule. |
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
| <a id="property-rule"></a> `rule` | `string` | `section-present`, `verify-fenced`, `files-owned-shape`, `scenario-shape`, `one-size`, `no-placeholder`, `pin-present` or `pin-match` (the last two only from `spp lint ticket`, which reads the pin and the `--pin` file); from `spp lint pr`: `link`, `section-present` (`## Ticket` or `## Laws`), `ticket-na`, `verify-sha`, `verify-corrected` or `interfaces`. |
| <a id="property-detail"></a> `detail` | `string` | What is wrong, in a sentence. |
