`spp dispatch <issue> --driver bg|desktop|subagent` starts one worker on a Sub-issue that nobody holds, and refuses
one held by the `claimed` label or an assignee. It has no `--json`.

What it does depends on the driver:

- `bg` writes the brief, starts a background session named `t-<N>` on it
  (`claude --bg --worktree sdd-<N> --name t-<N>`), records `t-<N>` as the Worker on the progress comment and prints
  `started t-<N>`.
- `desktop` and `subagent` write the brief and print its path, since those drivers are harness tools the skill
  starts itself.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Starts a worker on one Sub-issue, or writes the brief for the skill to start one.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Sub-issue (an issue number in the current repo or an issue URL) and `--driver bg\|desktop\|subagent`. |

#### Returns

`Promise`\<`number`\>

0 when the worker started or the brief is written; 2 on a usage error, with the usage on stderr; 1 when
  the ticket is held, `claude --bg` fails or `gh` fails, with the reason on stderr.

#### Example

```bash
spp dispatch 265 --driver bg
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp dispatch --help` prints.

```text
usage: spp dispatch <issue number | issue URL> --driver bg|desktop|subagent
Refuses a ticket that is held (the claimed label or an assignee). bg writes the brief, starts
claude --bg --worktree sdd-<N> --name t-<N> on it and records t-<N> as the worker; desktop and subagent
write the brief and print its path, because those drivers are harness tools the skill calls itself.
```
