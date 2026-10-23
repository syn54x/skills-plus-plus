---
"mattpocock-skills": minor
---

The `to-tickets` SDD pass now writes every Test scenario as an action and its observable result (`<action> → <result>`). The result is what the action caused: a request and its body, a persisted value, a rendered change. An affordance named in a result is exercised, never described, so "the footer reads accept day · 3" becomes "click Accept day → batch with the day's three ids". A worker deriving tests from a Sub-issue can no longer assert a lit key without pressing it, which on one seven-ticket epic sent a PR back at the gate for a test that checked a button was enabled and never clicked it. The ticket template's section names are unchanged.
