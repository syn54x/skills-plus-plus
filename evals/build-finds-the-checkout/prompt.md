---
description: Choosing a sub-session from a folder holding one checkout of the issue's repository names that checkout and a prompt to use building; with two checkouts it asks which and starts nothing.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

/build https://github.com/syn54x/skills-plus-plus/issues/340

You have no shell and no session tools in this run, so describe instead of calling. This session runs in the desktop app and can start sessions; it has started none. Its folder is `~/work`, which is not a git repository. One level down, `~/work/skills-plus-plus` has the git remote `git@github.com:syn54x/skills-plus-plus.git`, and `~/work/notes` has `https://github.com/syn54x/notes.git`.

I choose the sub-session. Reply with the exact settings you would start it with: the folder, whether it gets a worktree of its own, and its prompt.

Then answer a second case separately: suppose `~/work` also held `~/work/spp-old`, whose remote is `https://github.com/syn54x/skills-plus-plus`. What would you do then?
