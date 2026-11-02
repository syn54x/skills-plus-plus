# note

`spp note` keeps a local log of one-line notes, keyed by repo and Sub-issue, in spp's own state directory outside
every repository: it appends a note, lists the latest notes of an Epic, or notes a hook event.

Its three forms:

- `spp note <issue> <text> [--milestone]` appends a note with no GitHub call; `--milestone` also writes the text
  into the progress comment's notes.
- `spp note --list <epic> [--json]` prints the latest note of each Sub-issue of the Epic; with `--json`, a
  [LatestNote](#latestnote) list.
- `spp note --auto` is for the `PostToolUse` and `Stop` hooks: it reads the hook payload on stdin and notes a pull
  request opened, a `spp verify` run or a stop for the ticket of the session's `sdd/<N>-*` branch, so the worker
  never has to.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Appends a note, lists the latest notes of an Epic, or notes a hook event.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | `<issue> <text>` with `--milestone` to mirror it into the progress comment; or `--list <epic>` with `--json` for a [LatestNote](#latestnote) list; or `--auto` alone. |

#### Returns

`Promise`\<`number`\>

0 when the note is written or the list printed (`--auto` exits 0 when there is nothing to note); 2 on a
  usage error, with the usage on stderr; 1 when `gh` fails, with the reason on stderr.

#### Example

```bash
spp note 265 "tests red, writing the router change"
spp note --list 197 --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp note --help` prints.

```text
usage: spp note <issue> <text> [--milestone]
       spp note --list <epic number | issue URL> [--json]
       spp note --auto
<issue> is an issue number in the current repo or a GitHub issue URL. --milestone also writes the text into the
ticket's progress comment as its notes. --list prints the latest note of each ticket of the Epic: the ticket's
issue URL, the text and the time. --auto reads a hook payload on stdin and notes a gh pr create that printed a
pull request URL, a spp verify run, or a stop.
```

## Type Aliases

### LatestNote

```ts
type LatestNote = object;
```

The latest note of one Sub-issue: an entry of the `spp note --list --json` list.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-ticket"></a> `ticket` | `string` | The Sub-issue's URL. |
| <a id="property-text"></a> `text` | `string` | The note. |
| <a id="property-at"></a> `at` | `string` | When it was written, as an ISO time. |
