## What it does

The epic board is a pane beside the chat that shows an Epic in flight: every Sub-issue, grouped by the Wave it was dispatched in, with its state, its worker's latest note and the worker's name. It only displays. The build pipeline runs the same with the board closed, and `spp status` prints the same picture in any terminal.

To open the board for Epic #197, type this at the prompt:

```text
/epic-board 197
```

The pane opens with one group per Wave and a status line entry such as `#197 3/7 merged | #205 Verify passed 4f2c9a1`, which keeps showing the Epic's progress and its newest note after you close the pane.

## When to reach for it

You type `/epic-board`; the agent never opens it on its own. Reach for it while `/build` runs an Epic, when you want to see where every ticket stands without asking the orchestrator. It belongs to the Epic path. `ask-spp` routes between every skill when the right one is unclear.

The argument is the Epic as an issue number in the current repo or as an issue URL. Left out, the board uses the Epic of the branch you are on when it can tell: on a worker branch `sdd/<N>-<slug>`, that is the parent of issue N.

## Reading a row

Each row starts with a state chip, then the issue number and title:

| Chip | The Sub-issue |
| --- | --- |
| blocked | has an open blocker |
| ready | is in the Ready queue |
| claimed | carries the Claim mark or an assignee, with no open pull request |
| PR open | has an open pull request the slice gate has not passed on its current head |
| gate pass | has an open pull request whose spec and quality verdicts both passed |
| gate fail | has an open pull request with a failing verdict |
| merged | is closed |
| handed back | was handed back as `needs-info`, `ready-for-human` or `blocked` |
| not for agents | is open without `ready-for-agent` |

Under the title sits the latest Note and its age (`first red test, 5m ago`), then the worker named on the progress comment and the row's buttons:

| Button | What it does |
| --- | --- |
| issue | copies the issue's link |
| PR | copies the pull request's link, when there is one |
| transcript | shows the worker's transcript in the main view, when the worker is a subagent of this session |
| attach | puts `claude attach <worker>` in the prompt, when the worker is a background session |

The board refreshes every 2 minutes, after every turn and whenever a message reaches the session. Each refresh makes one `gh` call for the Epic's state and reads the notes from the local log that `spp note` writes. When a `gh` or `claude` call fails, one red line under the title says which call and why. A failing `gh` call leaves no ticket rows, since the board has nothing to draw them from; a failing `claude` call keeps the rows and drops only the worker buttons.

## Common questions

**Why is the board empty in a headless run?**
A `claude -p` run draws no panes. Run `spp status <epic>` there instead; it prints the same states as text, or as JSON with `--json`.

**Why does a row show no note?**
Notes live in a local log on the machine where the worker ran. A worker on another machine or in the cloud shows only the state GitHub holds, which is the chip and the worker's name.

**Does it fight with the ponytail band?**
No. Ponytail keeps its band above the prompt, and the board takes a pane.

**Why can I not open the board at all?**
The board is a Claude Code mod, an early-access feature that an organization's policy can turn off. The pipeline does not need it, and `spp status` is the fallback view.

## It's working if

- The status line shows the Epic's merged count rising as pull requests merge.
- A row's chip matches what the issue and its pull request show on GitHub.
