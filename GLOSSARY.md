# spp glossary

The words spp's skills, the `spp` tool and its docs use, each with one meaning. Where a term has a tempting synonym, the synonym is listed under _Avoid_.

## Language

**spp**:
The project: the Claude Code plugin named `spp` and the TypeScript command-line tool of the same name. The model judges; `spp` computes and writes anything that must come out the same every time (readiness, **Layers**, **Waves**, the next action, briefs, **Marker comments**, CI state, merge order, retro numbers).
_Avoid_: S++ in code and docs (keep it for prose about the project's history), skills-plus-plus (the 1.x plugin and the repository name)

**Issue tracker**:
Where a repo's issues live. For spp that is GitHub Issues, reached through `gh`.
_Avoid_: backlog, backlog manager

**Issue**:
One tracked piece of work in the **Issue tracker**: a bug, an enhancement, an **Epic** or a **Sub-issue**.
_Avoid_: ticket, except in skill names (`to-tickets`) and for a **Decision ticket**

**Triage role**:
A state label that triage puts on an **Issue** (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).

**Kind**:
What `/build <N>` finds N to be: an **Epic**, a hardened **Sub-issue** (built through its **Epic**, never as a **One-off**), a hardened **One-off**, or a raw issue that has to go through triage first. `spp kind` decides it.

### Planning

**Epic**:
A spec held as one GitHub **Issue**, written by `to-spec`. The body is the spec, and it serves as the PRD; its plan comment is the plan.

**Sub-issue**:
One tracer-bullet slice of an **Epic**, linked to it natively with parent and blocked-by edges. It carries the **Ticket contract**.

**One-off**:
An **Issue** with no **Epic** that triage has hardened to carry the **Ticket contract**, so `/build` can take it directly.

**Ticket contract**:
The sections a buildable issue carries: What to build, Acceptance criteria, Files owned (Create, Modify, Test), Interfaces (Consumes, Produces), Test scenarios, a **Verify block**, and one size label.

**Harden**:
Writing the **Ticket contract** into one issue. One model-invoked skill, `harden`, does it for both `to-tickets` (once per slice) and triage (once); `spp lint ticket` is its mechanical gate.

**Decision ticket**:
A child **Issue** of a wayfinder map that holds a question to settle, not a slice to build.

### Grilling

**Round**:
One batch of questions covering the whole **Frontier**. The next round waits on the answers.

**Frontier**:
The open decisions whose prerequisites are settled, so they can be asked now.

**Proxy**:
The thread that runs an `auto-grill` interview and answers each question for the **Principal** from a citable source.
_Avoid_: delegate, stand-in

**Principal**:
The person the **Proxy** answers for, and the only one who settles an **Escalation** or a **Challenge**.

**Escalation**:
An `auto-grill` question the **Proxy** cannot answer from a citable source, put to the **Principal** with the **Proxy**'s **Best fit**.

**Best fit**:
The answer the **Proxy** reaches by researching an **Escalation**: a recommendation to confirm or overrule, never a citation.

**Challenge**:
A recorded decision, or the existing code, that the **Proxy** could cite but that forces a worse long-term answer, so it goes to the **Principal** instead of being auto-answered.

### Building

**Five paths**:
The routes work takes through spp, which `ask-spp` routes between:
1. **Epic path**: grill or auto-grill, `to-spec`, `to-tickets`, `/build`, the panel when the **Epic** is big enough, `close-epic`.
2. **Single-issue path**: triage, then `/build`. A bug's reproduction becomes its **Verify block**, red on main.
3. **Unknown territory**: wayfinder, then `to-spec` once the map has a destination.
4. **Architecture**: `improve-architecture` files issues that enter path 1 or 2.
5. **Tiny unfiled work**: no spp at all.

**Routing block**:
The block between `<!-- sdd-routing -->` and `<!-- /sdd-routing -->` in a repo's `CLAUDE.md` or `AGENTS.md`, written by `/setup-spp`. Its Mode, Sizes and **Laws line** are what `spp preflight` reads; its presence puts a repo on the spp flow.

**Ready queue**:
The **Sub-issues** that are open, have no blocker that has not landed (closed, or its pull request merged into the integration branch), are not held (no **Claim mark**, no assignee) and carry `ready-for-agent`. Computed from GitHub, never read from a workflow status label.

**Layer**:
The **Sub-issues** whose blockers that have not landed all sit in earlier layers. Layer 0 is the first **Ready queue**.

**Wave**:
One concurrent dispatch of workers over the **Ready queue**, after the parallel safety check (no two workers own the same file), one worktree each.

**Driver**:
The mechanism a worker runs in, chosen by capability in this order: a desktop linked session, a background session, or an isolated subagent. Every driver keeps the same contract: a ticket number in, a pull request out, all state in GitHub.
_Avoid_: harness dispatch

**Claim**:
Marking a **Sub-issue** as held by whoever builds it, with the **Claim mark**. It leaves the **Ready queue** until a **Hand-back** or a merge.

**Claim mark**:
The label `claimed`. The holder sets it before any work; a **Hand-back** clears it, otherwise it stays through `pr-open`. Its lifecycle is an assignee's, not a workflow status's.

**Verify block**:
The fenced commands under a **Sub-issue**'s `## Verify`. Green means done. The result is recorded against the commit, and a stop hook refuses an unverified finish. Hardening pins the approved block by its hash, and `spp verify` runs only a block that matches its pin.

**Interface deviation**:
A **Sub-issue**'s declared departure from its own Produces line, stated in its pull request and recorded on the **Epic**'s plan. Only in-repo code signatures may deviate; a cross-repo contract or an interface the **Epic** states never does.
_Avoid_: interface drift (the undeclared kind, which is a defect)

**Multi-repo epic**:
An **Epic** whose **Sub-issues** live in more than one repo. Each repo gets its own integration branch; a cross-repo blocker must be merged and available before its consumer is ready.

**Hand-back**:
Returning a **Sub-issue** to a person or a queue: a worker stopping without a pull request, a gate routing one whose pull request stays open, or the safety check returning an unclaimed one. One operation records why on the progress comment, routes the issue (`needs-info`, `ready-for-human` or `blocked`) and clears the **Claim mark**.
_Avoid_: escalation (a grilling term), unclaim (only the mark half)

**Marker comment**:
An issue comment spp owns, found by the hidden marker on its first line and rewritten in place: the progress comment on a **Sub-issue**, the plan and wave comments on an **Epic**. The lines above are for people; the base64 data trailer on its last line is what `spp` reads back, and only from the gh user or an author GitHub marks OWNER, MEMBER or COLLABORATOR.
_Avoid_: status comment, sticky comment

**Note**:
A one-line message a worker posts with `spp note` at a milestone (claimed, first red test, green, Verify passed or failed, pull request open, blocked and why). Notes live in a local log; milestone notes are mirrored into the progress comment.

**Epic board**:
The view-only pane, opened with `/epic-board`, that shows every **Sub-issue** of an **Epic** grouped by **Wave**, with its state, its latest **Note** and its worker. The pipeline runs the same without it; `spp status` prints the same picture anywhere.

### Reviewing

**Slice gate**:
One fresh read-only reviewer on a slice pull request into the integration branch, giving separate spec and quality verdicts.

**Main gate**:
The review of an **Epic**'s pull request to main. The panel runs on its own when the **Epic** has four or more tickets, any size L ticket, or 1,000 or more changed lines; smaller ones get the single spec verdict.

**Persona**:
One read-only panel reviewer with a fixed focus. The panel's findings are deduplicated by `spp findings merge`.

**Composition pass**:
The panel's re-review after a FIX FIRST round: the always-on **Personas** run once over that round's combined fix diff, so defects where fixes meet surface before the merge.
_Avoid_: second panel, full re-review

**Law**:
A rule a reviewer may cite against a slice, layered by where it is written: the repo's declared documents, the **Epic**'s decisions, the **Sub-issue**'s own sections and the documents it cites, and the skills' own rules.
_Avoid_: standard, invariant

**Laws line**:
The **Routing block** line naming the repo documents that bind workers and reviewers.

**Law tag**:
The token on a review finding naming the **Law** it cites, by source. The **Retro** counts fix-round findings by it.

**Depth check**:
Four questions asked of every module a pull request adds or whose interface it changes: did it introduce shallowness, extract for testability, touch an already shallow module, or test past the interface. `codebase-design` owns them.

**Deepening opportunity**:
What `improve-architecture` reports when a **Depth check** fires: an idea with a timing and a strength, never a verdict.
_Avoid_: depth finding (at a gate, a fired check is an ordinary finding)

**Friend**:
A skill another plugin ships that spp may call when it is installed, listed in `.agents/invocation.md`. Today the only friend is `ponytail-review`.

### Closing

**Retro**:
The per-**Epic** counts `close-epic` computes from GitHub state alone with `spp retro`, including findings by **Law tag**. It names the weak step and stays in the user's repo.

**Skill feedback**:
An issue on `syn54x/skills-plus-plus` that `close-epic` may propose for a skill defect: allowlisted fields only, shown to a person and approved one by one, never from a non-interactive run.

## Relationships

- An **Epic** holds many **Sub-issues**; a **Sub-issue** may live in another repo than its **Epic**.
- `/build` reads the **Kind** of N before it does anything.
- A **Wave** dispatches part of the **Ready queue**, one **Driver** per worker.
- A **Hand-back** clears the **Claim mark** and returns the **Sub-issue** to the **Ready queue** or to a person.
- A **Law tag** names one **Law**; the **Retro** counts findings by it.
- A **Depth check** that fires at a gate is a finding; the same check in `improve-architecture` is a **Deepening opportunity**.
- Only a **Principal** settles an **Escalation** or a **Challenge**.

## Flagged ambiguities

- "brief" means the worker brief that `spp brief` renders, and nothing else. A document a **Sub-issue** cites is a cited document.
- "backlog" is not a domain term. The tool is the **Issue tracker**.
