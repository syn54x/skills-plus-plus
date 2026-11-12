`spp dispatch <issue>` readies one worker on a Sub-issue that nobody holds: it writes the brief and prints its path,
for the skill to start the `spp:worker` subagent on. It refuses a Sub-issue held by the `claimed` label or an
assignee. It takes no flags and has no `--json`.

Before it writes the brief, it records in spp's state directory whether this session is attended, and the worker's
`spp signal` trusts that decision over its own environment; a refused dispatch records nothing.

It refuses a folder that is not inside a git repository, before it reads GitHub. The `spp:worker` agent cuts its
worktree from the session's folder, so every worker started from such a folder would fail.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Writes the brief for one Sub-issue, for the skill to start its worker on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Sub-issue: an issue number in the current repo or an issue URL. Any flag is a usage error. |

#### Returns

`Promise`\<`number`\>

0 when the brief is written; 2 on a usage error, with the usage on stderr; 1 when the ticket is held, the
  folder is outside a git repository or `gh` fails, with the reason on stderr.

#### Example

```bash
spp dispatch 265
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp dispatch --help` prints.

```text
usage: spp dispatch <issue number | issue URL>
Refuses a ticket that is held (the claimed label or an assignee); otherwise writes the brief and prints
its path, for the skill to start the spp:worker subagent on. Refuses a folder outside a git repository,
because the spp:worker agent cuts its worktree from it.
```
