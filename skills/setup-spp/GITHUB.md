# GitHub setup: labels and issue types

Setup lists what exists first and writes only what is missing, so running it again changes nothing. Run every command from the repo root.

## Preflight

Check these before anything else:

```bash
gh --version
gh auth status
node --version
gh repo view --json owner --jq .owner.type
```

| Check | Needs | If it fails |
| --- | --- | --- |
| `gh --version` | 2.94 or later, for native sub-issues, blocked-by edges and issue types | Stop and ask the person to upgrade `gh`. |
| `gh auth status` | a logged-in account that can write to the repo | Stop and ask the person to run `gh auth login`. |
| `node --version` | 22.18 or later, because `spp` runs its TypeScript files directly | Report it and carry on: only `spp` needs Node, and the labels do not. |
| owner type | `Organization` gives Mode `org`, and `User` gives `labels-only` | Read the owner from `gh api "repos/{owner}/{repo}"` when `gh repo view` omits the type. |

## Labels

The table is the full set. List the repo's labels first:

```bash
gh label list --limit 200 --json name --jq '.[].name'
```

Create a label only when its name is not in that list. A label that exists keeps its own colour and description, because the pipeline reads the name and nothing else.

| Label | Colour | Description |
| --- | --- | --- |
| `needs-triage` | `FBCA04` | A maintainer has yet to evaluate this |
| `needs-info` | `D4C5F9` | Waiting for the reporter to answer |
| `ready-for-agent` | `0E8A16` | Fully specified, so an agent can build it |
| `ready-for-human` | `1D76DB` | A person has to decide or implement |
| `wontfix` | `FFFFFF` | Will not be actioned |
| `claimed` | `FBCA04` | A worker holds this Sub-issue; cleared when it stops without a pull request |
| `needs-plan` | `0E8A16` | The Epic is approved as a spec and has no Sub-issues yet |
| `blocked` | `5319E7` | Waits on a dependency the tracker already knows |
| `size:S` | `C2E0C6` | Fits one context window, three files or fewer |
| `size:M` | `BFD4F2` | Needs a plan, with one or two local workers |
| `size:L` | `F9D0C4` | Cuts across the codebase or needs several workers |
| `wayfinder:map` | `C5DEF5` | The wayfinder map itself: destination and decisions so far |
| `wayfinder:research` | `C5DEF5` | A map ticket closed by a cited research note |
| `wayfinder:prototype` | `C5DEF5` | A map ticket closed by a throwaway prototype |
| `wayfinder:grilling` | `C5DEF5` | A map ticket closed by an interview |
| `wayfinder:task` | `C5DEF5` | A map ticket closed by a small piece of work |

Create each missing one, taking the colour and description from its row:

```bash
gh label create "<name>" --color "<colour>" --description "<description>"
```

Leave `--force` off. It rewrites a label the repo has tuned, so a second run would change something.

## Issue types (org mode only)

`/to-spec` files an Epic with the `Epic` type, and `Task` marks each Sub-issue. Types belong to the organization, so they may already exist. List them:

```bash
gh api "orgs/$(gh repo view --json owner --jq .owner.login)/issue-types" --jq '.[].name'
```

Creating one changes the whole organization, so ask before each. Take the name, description and colour from this table and post it to the same path:

| Type | Description | Colour |
| --- | --- | --- |
| `Epic` | A spec held as one issue | `purple` |
| `Task` | One Sub-issue of an Epic | `blue` |

```bash
gh api -X POST "orgs/<org>/issue-types" -f name="<type>" -f description="<description>" -F is_enabled=true -f color="<colour>"
```

Creating types needs admin rights on the organization. Without them, say so and ask the person to have an admin add the two; do not retry.
