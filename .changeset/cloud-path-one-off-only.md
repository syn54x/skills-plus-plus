---
"mattpocock-skills": minor
---

The cloud path now builds only a one-off `size:S` ticket outside an epic. `sdd-implement.yml`'s job guard gains `github.event.issue.parent_issue_url == null`, so a sub-issue that `to-tickets` labels `ready-for-agent` is no longer claimed by Actions before `build-epic` computes its first wave, and every sub-issue (S, M and L) builds in a local wave onto one integration branch. The template in `setup-syn54x-skills` and this repo's installed copy carry the same guard. The `size:S` label description drops "cloud-eligible"; `to-tickets`' size table and report, the glossary's **Size ladder** and Section D5 say the cloud path is for an open, unassigned, parentless `size:S` issue, the kind `triage` sizes and hardens (#82). Repos that installed the old template pick up the guard on a Section D re-run (issue #66).
