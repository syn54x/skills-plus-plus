---
"mattpocock-skills": patch
---

`to-tickets` SDD §1 code check 2 now says where to look for output pins: one `git grep` for the exact output string from the repository root, over the whole tree, with fixtures, snapshots, CI workflow steps and docs examples named as places a pin lives. Hits that assert the output become Files owned entries; hits that merely mention it do not.
