# guard

`spp guard worktree` is the `PreToolUse` hook on Bash. In a session working in a linked worktree, it reads the
command from the hook payload on stdin and denies one that would write into the main checkout outside that
worktree; it allows the rest. It reads the command without running it: `$(...)`, variables and globs are not
expanded, so they never deny. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Runs the worktree guard over the hook payload on stdin.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `worktree`, the only guard. |

#### Returns

`Promise`\<`number`\>

0 to allow the command; 2 to deny it, with the reason on stderr, which Claude Code shows the model; 2 on
  a usage error too, with the usage on stderr.

#### Example

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf ../main/src"},"cwd":"."}' | spp guard worktree
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp guard --help` prints.

```text
usage: spp guard worktree   (a PreToolUse hook on Bash: reads the hook payload on stdin)
```
