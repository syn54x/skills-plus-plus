`spp status <epic> [--json]` prints every Sub-issue of an Epic with its state, grouped by Layer, from one GraphQL
query. Each line is the ticket's state, its number and title, and its pull request when it has one; a blocking
cycle gets a group of its own. The Epic's Fix pull requests (trusted pull requests into its integration branch that
close no Sub-issue, open or merged) follow under `Fixes`, one line each with its state, its number and the Sub-issue
its `Refs` line names or `unattributed`, and the header line ends with the open count, as in `(3 fixes open)`;
with no fixes it prints neither. With `--json` it prints the whole [EpicState](#epicstate) instead, the fixes as `fixes`.

## Functions

### run()

```ts
function run(args): Promise<number>;
```

Prints the Epic's state.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | `string`[] | The Epic (an issue number in the current repo or an issue URL), and `--json` for the [EpicState](#epicstate) shape. |

#### Returns

`Promise`\<`number`\>

0 when it printed the state; 2 on a usage error, with the usage on stderr. A `gh` error exits 1 with
  the reason on stderr.

#### Example

```bash
spp status 197
spp status https://github.com/syn54x/skills-plus-plus/issues/197 --json
```

## Variables

### USAGE

```ts
const USAGE: string;
```

The usage text `spp status --help` prints.

```text
usage: spp status <epic number | issue URL> [--json]
```

## Type Aliases

### TicketState

```ts
type TicketState = 
  | "blocked"
  | "ready"
  | "claimed"
  | "pr-open"
  | "gate-pass"
  | "gate-fail"
  | "merged"
  | "handed-back"
  | "not-agent";
```

Where a Sub-issue stands, the first that fits: `merged` (the issue is closed), `handed-back` (unheld, with a route
label; `blocked` beside `ready-for-agent` is not one, since that route waits on its blocked-by edge), `pr-open`,
`gate-pass` or `gate-fail` (an open pull request, by the slice gate's verdict on its current head), `claimed` (held
by the Claim mark or an assignee), `blocked` (an open blocker that has not landed), `not-agent` (no
`ready-for-agent` label), else `ready`.

***

### Ticket

```ts
type Ticket = object;
```

One Sub-issue of the Epic.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-number"></a> `number` | `number` | The issue number. |
| <a id="property-url"></a> `url` | `string` | The issue URL, which names the ticket everywhere else in the state. |
| <a id="property-repo"></a> `repo` | `string` | The issue's repository, `owner/repo`. |
| <a id="property-title"></a> `title` | `string` | The issue title. |
| <a id="property-size"></a> `size` | `"S"` \| `"M"` \| `"L"` \| `null` | The size its `size:` label gives, or null without one. |
| <a id="property-state"></a> `state` | [`TicketState`](#ticketstate) | Where the ticket stands. |
| <a id="property-layer"></a> `layer` | `number` \| `null` | The Layer: one above its highest blocker inside the Epic that has not landed, 0 with none; null when caught in a cycle. |
| <a id="property-blockedby"></a> `blockedBy` | `string`[] | URLs of open blockers, leaving out one that landed while its issue stays open. |
| <a id="property-landed"></a> `landed` | `boolean` | Whether its work has landed: the issue is closed, or a pull request of its merged into the integration branch. |
| <a id="property-claimed"></a> `claimed` | `boolean` | Whether it carries the Claim mark (the `claimed` label); an assignee also holds a ticket. |
| <a id="property-assignees"></a> `assignees` | `string`[] | Assignee logins. |
| <a id="property-labels"></a> `labels` | `string`[] | Label names. |
| <a id="property-pr"></a> `pr` | [`Pr`](#pr) \| `null` | The pull request it shows (an open one first, then a merged one, newest first), or null. Only its own count: in one of the Epic's repositories, opened by a trusted author and, while open, into the integration branch. |
| <a id="property-worker"></a> `worker` | `string` \| `null` | The progress comment's Worker line, or null. |
| <a id="property-note"></a> `note` | \| \{ `text`: `string`; `at`: `string`; \} \| `null` | The latest local note (`spp note`) with its ISO time, or null. |

***

### Fix

```ts
type Fix = object;
```

A Fix pull request: a trusted author's pull request into the Epic's integration branch that closes no Sub-issue,
open or merged (ADR 0011). `ticket` is the URL of the Sub-issue its body's first `Refs` line names, or null when
it names none of them (unattributed).

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-number-1"></a> `number` | `number` | The pull request number. |
| <a id="property-url-1"></a> `url` | `string` | The pull request URL. |
| <a id="property-repo-1"></a> `repo` | `string` | Its repository, `owner/repo`. |
| <a id="property-state-1"></a> `state` | `"OPEN"` \| `"MERGED"` | Its state: a closed unmerged pull request is no fix. |
| <a id="property-base"></a> `base` | `string` | The integration branch it merges into. |
| <a id="property-headsha"></a> `headSha` | `string` | The head commit's full sha. |
| <a id="property-ticket"></a> `ticket` | `string` \| `null` | The Sub-issue it belongs to, as an issue URL, or null. |
| <a id="property-verdict"></a> `verdict?` | [`Verdict`](#verdict) | Its `<!-- spp-verdict -->` comment, present only when it decodes. |

***

### EpicState

```ts
type EpicState = object;
```

An Epic and its Sub-issues as one snapshot derives them: the `--json` shape of `spp status`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-epic"></a> `epic` | `object` | The Epic; `branch` is the integration branch and `driver` the Driver the user chose, as its plan comment records them, or null. |
| `epic.number` | `number` | - |
| `epic.url` | `string` | - |
| `epic.repo` | `string` | - |
| `epic.title` | `string` | - |
| `epic.branch` | `string` \| `null` | - |
| `epic.driver` | [`Driver`](next.md#driver) \| `null` | - |
| <a id="property-tickets"></a> `tickets` | [`Ticket`](#ticket)[] | Every Sub-issue. |
| <a id="property-layers"></a> `layers` | `string`[][] | Issue URLs by Layer, Layer 0 first. |
| <a id="property-cycle"></a> `cycle` | `string`[] | Issue URLs caught in a blocking cycle. |
| <a id="property-counts"></a> `counts` | `Record`\<[`TicketState`](#ticketstate), `number`\> | How many tickets are in each state. |
| <a id="property-fixes"></a> `fixes` | [`Fix`](#fix)[] | The Fix pull requests, by number. |

***

### PrState

```ts
type PrState = "OPEN" | "MERGED" | "CLOSED";
```

A pull request's state on GitHub.

***

### Pr

```ts
type Pr = object;
```

A pull request linked to a Sub-issue.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-number-2"></a> `number` | `number` | The pull request number. |
| <a id="property-url-2"></a> `url` | `string` | The pull request URL. |
| <a id="property-state-2"></a> `state` | [`PrState`](#prstate) | Its state on GitHub. |
| <a id="property-repo-2"></a> `repo` | `string` | Its repository, `owner/repo`, which may lie outside the Epic: any repository can say it closes an issue. |
| <a id="property-base-1"></a> `base` | `string` | The branch it merges into. |
| <a id="property-headsha-1"></a> `headSha` | `string` | The head commit's full sha. |
| <a id="property-trusted"></a> `trusted` | `boolean` | Whether spp trusts its author: the gh user, or one GitHub marks OWNER, MEMBER or COLLABORATOR (ADR 0009), so a stranger's fork pull request into the Epic's repository is never the ticket's. |
| <a id="property-verdict-1"></a> `verdict?` | [`Verdict`](#verdict) | The pull request's `<!-- spp-verdict -->` comment as `spp verdict` writes it, present only when it decodes. |
| <a id="property-refs"></a> `refs` | `string` \| `null` | The issue URL the body's first `Refs #N`, `Refs owner/repo#N` or `Refs <issue URL>` names, or null without one. A fix pull request names the Sub-issue it belongs to this way (ADR 0011). |

***

### Verdict

```ts
type Verdict = object;
```

The slice gate's verdict on one head of a pull request, as its `<!-- spp-verdict -->` comment's trailer holds it.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-ticket-1"></a> `ticket` | `string` | The Sub-issue or One-off the pull request closes, as `spp verdict --ticket` gave it. |
| <a id="property-head"></a> `head` | `string` | The head the verdict was given on: a full sha, or a prefix of at least 7 characters. |
| <a id="property-spec"></a> `spec` | `"pass"` \| `"fail"` | The spec verdict. |
| <a id="property-quality"></a> `quality` | `"pass"` \| `"fail"` | The quality verdict. |
