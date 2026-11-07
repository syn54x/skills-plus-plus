`spp merge <pr> [--json]` merges a slice pull request, or a Fix pull request, into its Epic's integration branch, only when its gate passed
on the current head, its blockers' pull requests have merged, its base is the integration branch and its checks
pass. The gate's verdict counts only from a trusted author (the gh user, or an OWNER, MEMBER or COLLABORATOR), and
`spp merge` re-reads the verdict comment to check that before it merges (ADR 0009). It merges with the Routing
block's merge method (squash by default) pinned to the head the gate passed, then records the pull request on the
wave comment. A Fix pull request (it closes no issue; its body `Refs` a Sub-issue) merges the same way when a
trusted author's verdict passes on its head, its base is the Epic's integration branch and its checks pass, and
writes nothing to the wave comment. A conflict is never resolved here: the worker rebases. It prints
`merged <pr> into <branch>` or `not merged: <reason>`; with `--json` it prints [MergeResult](#mergeresult).

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Merges one slice or Fix pull request when everything allows it.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The pull request (a number or URL), and `--json` for the [MergeResult](#mergeresult) shape. |

#### Returns

`Promise`\<`number`\>

0 when it merged; 3 on a merge conflict (`rebase needed`), so the worker rebases; 1 for any other
  refusal, for a merge whose wave comment could not be recorded, and on a `gh` error; 2 on a usage error, with the
  usage on stderr.

#### Example

```bash
spp merge 264 --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp merge --help` prints.

```text
usage: spp merge <pr number | pr URL> [--json]
```

## Type Aliases

### MergeResult

```ts
type MergeResult = object;
```

What `spp merge` did: its `--json` shape.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-merged"></a> `merged` | `boolean` | Whether the pull request merged. |
| <a id="property-reason"></a> `reason?` | `string` | Why it did not merge, such as `rebase needed` or `checks failing: <runs>`. |
| <a id="property-interfaceschanged"></a> `interfacesChanged?` | `string` | The pull request body's `Interfaces changed:` lines that are not `none`, one per line, so the orchestrator sees an Interface deviation. |
