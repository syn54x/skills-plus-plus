<!-- spp-feedback/1 -->
**Skill:** harden step 3
**Category:** verify-unrunnable
**Repo:** acme/app
**Links:** https://github.com/acme/app/pull/12
**Observed:** acme broke the step
**Harness:** claude-code 2.1.0 · gh 2.94.0
**Proposed change:** add a check
**Eval case:** the fix lands with an eval case that reproduces this defect, red before the fix and green after it.
