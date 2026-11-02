`spp` is the command-line tool behind the skills. It computes and writes everything that has to come out the same on every run: which Sub-issues are ready, the order to merge them, CI state, the Marker comments, the Claim mark and the retro numbers. The skills call it for you; you call it yourself to look at an Epic or to script around one.

To see what an issue is, run `spp kind` with its number:

```bash
spp kind 227 --json
```

It prints the issue's kind and why:

```json
{
  "kind": "ticket",
  "reason": "carries the ticket contract and one size"
}
```

Without `--json` the same answer is one line, `ticket: carries the ticket contract and one size`.

## Conventions

- **Issues and pull requests.** An `<issue>` or `<epic>` is an issue number in the current repo or a GitHub issue URL; use the URL when the Epic spans repos. A `<pr>` is a pull request number or URL.
- **JSON.** A command that takes `--json` prints one pretty-printed JSON value on stdout instead of its text lines. The shapes below are TypeScript-style: `?` marks a key that can be absent, `|` separates the values a field can take.
- **Exit codes.** 0 is success and 2 is a usage error, with the usage on stderr. 1 is a failed check or a `gh` error, with the reason on stderr. A few commands give a code its own meaning, such as 3 for "do this again on fresh state"; their entries say so.
- **Help.** `spp --help` lists the commands, `spp --version` prints the version, and any command run with missing arguments prints its own usage.

Commands that write a Marker comment print the comment's URL. The comment formats, the data trailer and the Claim mark are recorded in ADR 0006 and ADR 0007 in the repository's `.agents/adr/`.

## Reading an Epic

### status

```text
spp status <epic> [--json]
```

Prints every Sub-issue of the Epic with its state, grouped by Layer, from one GraphQL query. With `--json`:

```ts
{
  epic: { number: number; url: string; repo: string; title: string; branch: string | null };
  tickets: {
    number: number; url: string; repo: string; title: string;
    size: "S" | "M" | "L" | null;
    state: "blocked" | "ready" | "claimed" | "pr-open" | "gate-pass" | "gate-fail" | "merged" | "handed-back" | "not-agent";
    layer: number | null;
    blockedBy: string[];        // URLs of open blockers
    claimed: boolean;           // carries the claimed label
    assignees: string[];
    labels: string[];
    pr: { number: number; url: string; state: "OPEN" | "MERGED" | "CLOSED"; headSha: string;
          verdict?: { ticket: string; head: string; spec: "pass" | "fail"; quality: "pass" | "fail" } } | null;
    worker: string | null;      // from the progress comment's Worker line
    note: { text: string; at: string } | null;   // the latest local note
  }[];
  layers: string[][];           // issue URLs, Layer 0 first
  cycle: string[];              // issue URLs caught in a blocking cycle
  counts: Record<state, number>;
}
```

### next

```text
spp next <epic> [--json]
```

Prints the build's next actions, one per line. The build loop is: run `spp next`, do what it says, run it again. With `--json`:

```ts
{
  actions: {
    kind: "preflight" | "branch" | "dispatch" | "gate" | "fix" | "hand-back" | "merge" | "wait" | "main-gate" | "close" | "stuck";
    tickets?: string[];         // for dispatch, gate, fix, hand-back and merge
    pr?: string;                // the pull request URL the action is about
    driver?: "desktop" | "bg" | "subagent";
    panel?: boolean;            // on main-gate: whether the Epic is large enough for the review panel
    reason: string;
  }[];
}
```

### kind

```text
spp kind <issue> [--json]
```

Says whether an issue is an Epic (it has Sub-issues), a ticket (it passes `spp lint ticket`) or raw (anything else). `/build` routes on it. With `--json`: `{ kind: "epic" | "ticket" | "raw"; reason: string }`, where a raw issue's reason lists the lint failures.

### preflight

```text
spp preflight <epic> [--json]
```

Checks the Epic's preconditions in order: `gh` 2.94 or later, the Epic open, at least one Sub-issue, a plan comment, and a Routing block in `CLAUDE.md` or `AGENTS.md`. Prints `ok:` per passing check; at the first failure it prints `fail:` and `fix:` on stderr and exits 1. With `--json`, a pass prints the parsed Routing block:

```ts
{
  mode: "org" | "labels-only";
  sizes: string;
  laws: string[];
  panel: { tickets: number; sizeL: boolean; lines: number };
  merge?: "squash" | "merge" | "rebase";   // absent means squash
}
```

### wave plan

```text
spp wave plan <epic> [--max N] [--json]
```

Runs the parallel safety check over the ready Sub-issues: overlapping Files owned in one repo, and Consumes and Produces pairs across repos. Prints the tickets that can run together (at most `--max`, default 4) and the held ones with why. With `--json`: `{ wave: string[]; held: { ticket: string; reason: string }[] }`, where a ticket is its number, or `owner/repo#N` outside the Epic's repo.

### checks

```text
spp checks <pr | sha> [--json]
```

Reads CI for a pull request, or the check runs of a commit (7 to 40 hex characters). Pending is never a pass, a cancelled run counts as a failure, and runs that all skip read as `none`. Prints the result, followed by the failing or pending run names. With `--json`:

```ts
{
  result: "pass" | "fail" | "pending" | "none";
  runs: { name: string; bucket: "pass" | "fail" | "pending" | "skipping" | "cancel" }[];
}
```

### retro

```text
spp retro <epic> [--json]
```

Collects the Epic's retro numbers from GitHub alone: findings by Law tag and by Sub-issue from the gate's verdicts, fix rounds, Hand-backs, the panel's rounds, and ponytail's hits. An input it cannot read is named on stderr and reported as `"not found"`, never as 0. With `--json`:

```ts
{
  byCause: Record<string, number>;     // Law tag (or "none") to findings in failing verdicts
  byTicket: Record<string, number>;    // "#N" or "owner/repo#N" to findings
  rounds: number;                      // failing verdicts across the Epic
  handBacks: number;
  panel: { rounds: number; findings: number } | "not found";
  ponytail: { hits: number; unique: number; overlap: number } | "not found";
}
```

## Starting work

### branch

```text
spp branch <epic> [--from <base>]
```

Creates the Epic's integration branch `feat/<slug>` from `origin/<base>` (default `main`), pushes it and records it on the plan comment. If the branch exists it switches to it. Prints the branch name. No JSON.

### brief

```text
spp brief <issue> [--out FILE]
```

Writes the worker brief for a Sub-issue (its body verbatim, the Laws sources, the branch mechanics and the report format) and prints the file's path. Without `--out` the file goes in a new temporary directory. No JSON.

### dispatch

```text
spp dispatch <issue> --driver bg|desktop|subagent
```

Starts a worker for one Sub-issue, refusing (exit 1) one that is held by the claimed label or an assignee. `bg` writes the brief, starts a background session named `t-<N>` on it, records `t-<N>` as the Worker and prints `started t-<N>`. `desktop` and `subagent` write the brief and print its path, since those drivers are started by the skill. No JSON.

### wait

```text
spp wait <epic> [--interval SECONDS]
```

Polls the workers and GitHub every `--interval` seconds (default 30) and exits 0 when something changes, with one line per change, such as `#12 claimed -> pr-open` or `t-12 done`. Run it in the background so its exit wakes the orchestrator. No JSON.

## Marker comments and the claim

### claim and unclaim

```text
spp claim <issue>
spp unclaim <issue>
```

Add or remove the `claimed` label, the Claim mark, creating the label first if the repo lacks it. They print nothing.

### progress

```text
spp progress <issue> [--status in-progress|pr-open|verify-passed|changes-requested|handed-back]
                     [--worker TEXT] [--branch NAME] [--pr N|URL]
                     [--verify "not-run" | "passed <sha7>" | "failed <sha7>"] [--notes TEXT]
```

Writes the Sub-issue's one `<!-- sdd-progress -->` comment, rewriting it in place. A field you do not pass keeps its stored value. A trailer that does not decode stops the write with exit 1 rather than erase the state.

### hand-back

```text
spp hand-back <issue> needs-info|ready-for-human|blocked --reason TEXT [--blocked-by <issue>]
```

Returns a Sub-issue to a person or a queue in one call: the progress comment first, then the route label, then the Claim mark removed. `--blocked-by` goes only with `blocked`, where it adds the blocked-by edge and keeps `ready-for-agent`; every other Hand-back removes `ready-for-agent`. A step that fails says which, and running the same call again finishes it.

### plan

```text
spp plan <epic> [--goal TEXT] [--constraints TEXT] [--branch NAME] [--repos a/b,c/d]
                [--narrowed TEXT]... | [--narrowed none] [--add-deviation TEXT] [--table-file FILE]
```

Writes the Epic's `<!-- sdd-plan -->` comment. `--narrowed` replaces the stored list with every `--narrowed` of the call, `--narrowed none` clears it, and a call without it keeps it; `--add-deviation` appends.

### wave

```text
spp wave <epic> add   --n N --tickets 101,owner/repo#7 --workers w1,w2 --started ISO8601
                      --edges "104<103,owner/repo#7<101" | --edges none
spp wave <epic> pr    --ticket 101|owner/repo#7 --pr URL|#n
spp wave <epic> panel --round R --verdict "FIX FIRST"|"HUMAN DECISION"|MERGE [--report URL]
                      [--severity critical=1,important=2,minor=3] [--persona name=count,...] [--dropped D]
```

Writes the Epic's `<!-- sdd-wave -->` comment. `add` replaces any wave with the same `--n`, `panel` replaces the round with the same `--round`, so a retried call never duplicates an entry. `pr` records a pull request on the last wave holding `--ticket`, given in the form `add` stored. For the read-only `wave plan`, see [wave plan](#wave-plan).

### upsert

```text
spp upsert <issue> <marker> <body-file>
```

Writes a one-writer comment, such as the Epic's summary or retro, verbatim. The body file's first line must be the marker.

### verdict

```text
spp verdict <pr> --ticket N --head SHA --spec pass|fail --quality pass|fail
```

Writes the gate's `<!-- spp-verdict -->` comment on the pull request, but only while the pull request is still at `SHA`. When the head has moved it exits 3, and the reviewer reviews the new head.

### note

```text
spp note <issue> <text> [--milestone]
spp note --list <epic> [--json]
spp note --auto
```

Appends a one-line note to a local log keyed by repo and Sub-issue; `--milestone` also writes the text into the progress comment's notes. `--list` prints the latest note of each Sub-issue of the Epic. `--auto` is for hooks: it reads the hook payload on stdin and notes a pull request opened, a `spp verify` run or a stop. With `--list --json`: `{ ticket: string; text: string; at: string }[]`, where `ticket` is the issue URL and `at` an ISO time.

## Gates

### lint ticket

```text
spp lint ticket <issue> [--json]
```

The mechanical half of hardening: the required sections, a fenced Verify block, Files owned lines starting `Create`, `Modify` or `Test`, Test scenarios shaped `<category>: ... → ...`, exactly one `size:` label, and no placeholder text. Prints `ok`, or one `<rule>: <detail>` line per failure and exits 1. With `--json`: `{ ok: boolean; failures: { rule: string; detail: string }[] }`, where `rule` is one of `section-present`, `verify-fenced`, `files-owned-shape`, `scenario-shape`, `one-size` or `no-placeholder`.

### verify

```text
spp verify <issue>
spp verify --check
```

The first form runs the Sub-issue's Verify block from the repo root, one command per line, prints `pass:` or `fail:` per command, and records the result as a note on `HEAD` (exit 1 if any failed). `--check` is the stop hook: on an `sdd/*` branch it exits 2 when the tree is dirty or `HEAD` has no passing record. No JSON.

### merge

```text
spp merge <pr> [--json]
```

Merges a slice pull request into its Epic's integration branch, only when its gate passed, its blockers' pull requests have merged and its checks pass, then records it on the wave comment. A conflict exits 3 with `rebase needed`, so the worker rebases; any other refusal exits 1. With `--json`:

```ts
{
  merged: boolean;
  reason?: string;              // why it did not merge
  interfacesChanged?: string;   // the pull request's Interfaces changed lines, when any is not "none"
}
```

### findings merge

```text
spp findings merge <file...> [--json]
         [--verdict <round> --spec pass|fail --coherence pass|fail --verify pass|fail
          --checks pass|fail|pending|none [--missing name,name]]
```

Merges the review panel's Persona findings. Each file is `{ persona: string; findings: { file, line, title, severity, confidence, law?, body }[] }`. Findings under 80 confidence are dropped, and findings on the same file, within 5 lines and with the same normalised title become one that keeps the highest severity and every Persona. `--verdict` adds the panel's verdict; from round 3 a FIX FIRST is written HUMAN DECISION. With `--json`:

```ts
{
  findings: { id: string; file: string; line: number; title: string;
              severity: "critical" | "important" | "minor"; personas: string[]; law?: string; body: string }[];
  counts: { severity: Record<string, number>; persona: Record<string, number> };
  verdict?: "MERGE" | "FIX FIRST" | "HUMAN DECISION";
}
```

### guard worktree

```text
spp guard worktree
```

The `PreToolUse` hook on Bash. In a session working in a linked worktree, it reads the command from the hook payload on stdin and denies (exit 2, reason on stderr) one that would write into the main checkout. It reads the command without running it. No JSON.

### feedback check

!!! note "Arriving with #256"
    This command lands with [#256](https://github.com/syn54x/skills-plus-plus/issues/256), still in review.

```text
spp feedback check <body-file> [--title-file <file>]
```

The outbound check on a skill-feedback draft that `/close-epic` proposes, before anyone files it. Exits 0 when the draft is clean, 2 when it is blocked, with one line per hit, and 1 when the feedback profile is off or on a usage error. No JSON.
