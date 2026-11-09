`spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d] [--narrowed TEXT]... |
[--narrowed none] [--add-deviation TEXT] [--table-file FILE] [--driver desktop|bg|subagent] [--by "<skill> <step>"]` writes the Epic's `<!-- sdd-plan -->` comment,
rewriting it in place, and prints its URL. A field you do not pass keeps its stored value. `--narrowed` replaces the
stored list with every `--narrowed` of the call, `--narrowed none` clears it, and a call without it keeps it;
`--add-deviation` appends to the Deviated list. `--driver` records the Driver the user chose for the run, which
`spp next` then reports on `dispatch`. The table file is copied in verbatim. The trailer's `by` records the
write's maker: to-tickets, or the skill and step `--by` names. It has no `--json`.

Each `--add-deviation` also records a `contract-edited` Signal. When the text starts with an issue (`#N`, `N`,
`owner/repo#N` or an issue URL, a trailing `:` allowed) it is charged to the maker of that issue's Verify pin (harden
when it names none); otherwise to the maker of the plan comment before this write (to-tickets when it names none).
It records nothing under `CI`, outside an Attended session, or when the Self-improvement mode of this checkout, or of
another repo whose issue it is about, is Off. A Signal goes to this checkout's log, and a failure
while recording is one `signal not recorded:` line on stderr that leaves the exit code as it was.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Merges the given fields into the Epic's plan comment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), then any of the flags above. |

#### Returns

`Promise`\<`number`\>

0 when the comment is written; 2 on a usage error, with the usage on stderr; 1 when `gh` fails or the
  stored trailer does not decode, with the reason on stderr.

#### Example

```bash
spp plan 197 --branch feat/rebuild --add-deviation "#202: an unreadable trailer stops the write"
spp plan 197 --driver subagent
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp plan --help` prints.

```text
usage: spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d]
                       [--narrowed TEXT]... | [--narrowed none] [--add-deviation TEXT] [--table-file FILE]
                       [--driver desktop|bg|subagent] [--by "<skill> <step>"]
--narrowed replaces the stored list with every --narrowed of the call, --narrowed none clears it, and a
call without --narrowed keeps it; --add-deviation appends. --driver records the run's Driver.
--by records the write as that skill's (default to-tickets), the rest of the value as its step.
```
