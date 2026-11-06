# Docs pages

Every promoted skill has a page for people at `docs/skills/<name>.md`, published on the Zensical site at `https://skills.x54.sh/skills/<name>/`. A page is neither the skill nor a summary of its `SKILL.md`. Its job is to let a reader hold one skill in their head: what it does, when to reach for it, and how to tell it is working. Most spp skills are user-invoked, so the reader is the only index that remembers they exist; the pages are how that index gets built.

## When to touch a page

| Change to a promoted skill | Page action |
| --- | --- |
| Added | Create the page and its nav entry. |
| Renamed | Move the file to the new name and update the nav entry, because the URL follows the name. |
| Behaviour changed | Re-sync the sections the change touches. |
| Removed | Keep the page, opening it with `> **Archived.**` naming the version that removed it and any replacement, so the URL keeps resolving. |
| Shipped as experimental | Open the page with `> **Experimental.**` and one sentence saying the skill may change or be removed, which is what the marker means. |
| Graduated from experimental | Take the marker off. |

## Page shape

A page has no H1: the site takes the title from the page's nav entry in `zensical.toml`, labelled with the skill name. The landing and install page, `docs/index.md`, is the only page with an H1.

Four sections, in this order, make a page finished:

1. **What it does.** One or two paragraphs. Open with the skill's job in one sentence, then the fact that makes it behave differently from the obvious default (for `to-spec`: it writes from the conversation already held, and asks nothing new). State that fact as a plain sentence, never behind a label such as "The key point:".
2. **When to reach for it.** Say how it starts ("You type `/<name>`; the agent never starts it on its own", or "Type `/<name>`, or the agent starts it when a task fits"), then the trigger, then the sibling to use instead where the two are easy to confuse. Name the path it belongs to and link `ask-spp`, the router over every skill.
3. **Common questions.** Questions readers have asked, each in bold with its answer beneath. Hunt for them before writing: the issues on `syn54x/skills-plus-plus` (`gh issue list --search "<name>" --state all`) and `CHANGELOG.md` for renames and behaviour changes. Keep as many as the evidence supports; a well-used skill earns six, a quiet one one or two. An invented question teaches nothing, so the section may be absent.
4. **It's working if.** A few bullets the reader can check in their own work without opening `SKILL.md`. "The spec has no open questions left" passes; "step 4 ran" does not.

Between sections 2 and 3 a page may add a **Prerequisites** section (setup the skill needs, a workspace it writes into) and one to three free sections in the skill's own vocabulary. One of them names the skill's leading idea, the word the reader will later think with when reaching for it (a *tracer bullet*, a *deep module*, *red, green*).

## Conventions

- A page writes no install commands. Link the install page (`../index.md#install`) instead, so the commands exist in one place.
- Links between docs pages are relative `.md` paths, which both the site and GitHub resolve. Anything outside `docs/` gets an absolute URL.
- A choice between branches is a table or a list, never a paragraph.
- Use the `GLOSSARY.md` term for anything it defines.
- Name no author and quote none: every claim stands on its own. An anonymous user report is fine as evidence.
- Call the Skill tool with "writing-for-humans" for the prose itself; this page wins where it is more specific.

## Done when

- The page sits at `docs/skills/<name>.md` with a nav entry, and no page survives under an old name.
- The four sections are present in order, and What it does states the defining fact.
- Every link resolves, and the strict docs build passes.
