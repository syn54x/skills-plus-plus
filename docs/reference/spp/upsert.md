# upsert

`spp upsert <issue> <marker> <body-file>` writes a one-writer Marker comment, such as the Epic's summary or retro,
verbatim and in place, and prints its URL. The body file's first line must be the marker; the comment gets no data
trailer. It has no `--json`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Creates or rewrites the issue's comment that starts with the marker.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The issue (a number in the current repo or a GitHub issue URL), the marker, and the body file. |

#### Returns

`Promise`\<`number`\>

0 when the comment is written; 2 on a usage error (a missing body file, or a first line that is not the
  marker), with the usage on stderr; 1 when `gh` fails, with the reason on stderr.

#### Example

```bash
spp upsert 197 "<!-- sdd-summary -->" summary.md
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp upsert --help` prints.

```text
usage: spp upsert <issue> <marker> <body-file>
The body file's first line must be the marker; it is written verbatim, with no trailer.
```
