`spp wait <epic> [--interval SECONDS]` polls the Epic's state and the `claude` session list every interval
(default 30 seconds) and exits when something changes, with one line per change: a ticket's state
(`#12 claimed -> pr-open`) or one of its workers that stopped working (`t-12 done`). Run it in the background so its
exit wakes the orchestrator. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Waits until the Epic or one of its workers changes.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), then `--interval SECONDS`. |

#### Returns

`Promise`\<`number`\>

0 once something changed; 2 on a usage error, with the usage on stderr; 1 when `gh` fails, with the
  reason on stderr.

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
usage: spp wait <epic number | issue URL> [--interval SECONDS]
Exits 0 with one line per change: a ticket's state ("#12 claimed -> pr-open") or a worker that stopped working
("t-12 done"). The interval defaults to 30 seconds.
```
