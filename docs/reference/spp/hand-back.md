`spp hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]` returns a Sub-issue
to a person or a queue in one call. It writes in this order: the progress comment (status `handed-back` with the
route and reason), then the route label, then removes the Claim mark, so a failure part-way leaves the ticket held,
never released without a route, and running the same call again finishes it. `--blocked-by` goes only with
`blocked`, where it adds the blocked-by edge and keeps `ready-for-agent`; every other Hand-back removes
`ready-for-agent`. `--by "<skill> <step>"` names the progress write's maker in its trailer's `by` (implement-issue
when absent). It prints the progress comment's URL and has no `--json`.

Each Hand-back also records a Signal: `needs-info` a `brief-gap` and `blocked` a `missed-edge`, both charged to the
maker of the Verify pin (harden when it names none), and `ready-for-human` a `human-needed`, charged to the maker of
the progress comment before this write (implement-issue when it names none). A reason starting `worker lost`
records none. It records nothing under `CI`, outside an Attended session, or when the Self-improvement mode is Off, and a failure
while recording is one `signal not recorded:` line on stderr that leaves the exit code as it was.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Hands a Sub-issue back along one route.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The issue (a number in the current repo or a GitHub issue URL), the route, `--reason TEXT`, and with the `blocked` route `--blocked-by <issue>` when the blocker is known. |

#### Returns

`Promise`\<`number`\>

0 when all three steps are done; 2 on a usage error, with the usage on stderr; 1 when a step fails, with
  `step <n> (<what>) failed; re-run to finish` on stderr, or when the progress comment's trailer does not decode.

#### Example

```bash
spp hand-back 265 needs-info --reason "the ticket cites src/tax.ts, which does not exist"
spp hand-back 265 blocked --reason "needs the auth route" --blocked-by 240
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp hand-back --help` prints.

```text
usage: spp hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]
                            [--by "<skill> <step>"]
--blocked-by goes only with the blocked route, where it adds the blocked-by edge and keeps ready-for-agent;
every other hand-back, blocked without --blocked-by included, removes ready-for-agent.
--by records the progress write as that skill's (default implement-issue), the rest of the value as its step.
```
