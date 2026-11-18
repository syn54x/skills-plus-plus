# Changing a skill because of a bare fix-round count

spp does not change a skill on the strength of a `fix-round` count alone: a Skill feedback issue that names no step and no behaviour, only how many review gates failed, is closed.

## Why it holds

A `fix-round` Signal is recorded once for every failed verdict and charged to the worker's skill, whatever the finding was. The count says a reviewer found something; it does not say what, or whose fault it was. A finding the ticket mandated, a fix regression and a one-off slip in skill text all count the same. With no behaviour named there is nothing to reproduce, so no eval case can go red before a fix and green after it, and `SCOPE.md` asks every feedback issue for what was run, what spp did and what was expected.

## Revisit when

The issue names a step and a behaviour that the evidence shares (for example, most of the failed gates cite the same Law or the same step), or `fix-round` Signals are charged by cause, so the count itself points at one.

## Asked by

- #428: "implement-issue: fix-round (3/9 runs)"
