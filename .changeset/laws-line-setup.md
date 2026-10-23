---
"mattpocock-skills": minor
---

`setup-syn54x-skills` Section D now writes a `Laws:` line into the routing block, naming the repo documents that bind workers and reviewers alike. The default is every fallback document that exists in the repo (`CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `CONCEPTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md` and the ADR directory as the domain docs name it), led into one question for other documents that bind, such as a design system or a read-before-UI-work page. On a re-run every entry of an existing Laws line is carried forward and only additions are proposed, the way a legacy `Upstream feedback: on` is rewritten rather than dropped. The routing-block reference documents the line beside Mode and Upstream feedback, with the fallback list the skills use when it is absent.
