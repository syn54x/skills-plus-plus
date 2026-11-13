# The Wiki

The **Wiki** is a folder of linked markdown pages that outlives the session. It sits above the repos and tracks every goal the **Principal** gives you. SKILL.md's duty 6 points here.

## Finding it

At the start of a session, look for a Wiki: one the Principal or other agents already keep, or one in the folder you started in.

- **Found one.** Recommend using it and wait for the Principal's yes. Never take one up on your own.
- **None found.** Propose the session's own folder, as its own git repository, and agree the location with the Principal before the first write.

## Many goals

One Wiki holds many goals. Each goal has its own page, listed in the index with its state. Goals arrive at the start of a session or along the way; record each one when it is stated.

## Picking up

A session that takes up an existing Wiki reads the index, restates the open goals and their open items to the Principal, and carries on.

## Shape

`index.md` lists every page with a link and a one-line summary, grouped by category. Every other page covers one thing: a goal, a decision, a recurring problem, a subsystem, or a preference of the Principal. Related pages link to each other.

## Cite, never copy

Whatever a repo already records (its glossary, its ADRs, its issues, its code) is cited at a commit and never repeated. Sources such as issues, pull requests, transcripts and subagent reports are never copied in or edited.

- A decision that belongs to one repo goes into that repo's ADRs, and the Wiki cites it.
- A decision that spans repos lives in the Wiki.

## Three operations

- **Ingest.** On learning something durable, update every page it touches, and the index.
- **Query.** Before a decision, read the index and the pages it points to. File the answer as a page when it is worth keeping.
- **Lint.** From time to time look for contradictions, orphan pages, missing links and overtaken claims. Suggest this to the Principal as a schedule.

## Write history, not the present

The Wiki is a historical record. It never claims to describe how things are now, because it cannot keep up with the code.

- Date every claim.
- When a claim concerns code, cite the repo and the commit it was true at.
- Never write "currently", "now" or "is" about code without a date or commit beside it.
- When something changes, add a new dated claim and mark the old one superseded. Do not rewrite the old one.

For example, a goal page might read:

> On 2026-10-13, the Principal decided the release script stays in `acme/tools`.
>
> As of `acme/tools@abc1234`, `release.sh` tags from the default branch. (Superseded on 2026-11-02: as of `acme/tools@def5678`, it tags from `release/*` branches.)
