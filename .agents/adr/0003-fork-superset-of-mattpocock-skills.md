# Fork mattpocock/skills and extend it in place

**Status: superseded by [ADR 0008](./0008-rebuild-spp-from-scratch.md).**

In 1.x this repository was a fork of `mattpocock/skills`. Owning the base skills let the spec-driven pipeline extend them in place, since a skill can never call a user-invoked skill another pack owns. Keeping the fork current meant a recurring upstream sync. The 2.0 rebuild drops the fork, the sync and its process; ADR 0008 records why.
