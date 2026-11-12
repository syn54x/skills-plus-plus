`spp wait <epic> [--interval SECONDS] [--timeout SECONDS]` polls the Epic's state every interval (default 120
seconds) and exits when something changes, with one line per change: a ticket's state (`#12 claimed -> pr-open`),
or a Fix pull request that appeared, merged or went (`#77 OPEN -> MERGED`, `absent` on either side), got a new head
or a gate verdict (`#77 OPEN -> OPEN (new head)`, `(gate-pass)`). It reads no session list: the build learns of its
own workers finishing from them, and `spp next --resume` asks about the ones a dead session lost. When nothing
changes for `--timeout` seconds (default 1800) it exits with one `heartbeat:` line, so the orchestrator never
sleeps on a change it cannot see. Run it in the background so its exit wakes the orchestrator. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Waits until the Epic changes, or the timeout passes.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), then `--interval SECONDS` and `--timeout SECONDS`. |

#### Returns

`Promise`\<`number`\>

0 once something changed or the timeout passed; 2 on a usage error, with the usage on stderr; 1 when `gh`
  fails, with the reason on stderr.

#### Example

```bash
spp wait 197 --interval 60
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp wait --help` prints.

```text
usage: spp wait <epic number | issue URL> [--interval SECONDS] [--timeout SECONDS]
Exits 0 with one line per change: a ticket's state ("#12 claimed -> pr-open") or a fix pull request's
("#77 OPEN -> MERGED"); or, when nothing changed for --timeout seconds, one "heartbeat:" line.
The interval defaults to 120 seconds and the timeout to 1800.
```
