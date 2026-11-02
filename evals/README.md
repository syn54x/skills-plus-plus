# Evals

Cases for `claude plugin eval`, run against the plugin in the repo root and against a no-plugin baseline. The score delta says what the plugin adds.

```bash
claude plugin eval . --trust-plugin                      # the whole suite
claude plugin eval . --case 'grilling-*' --trust-plugin  # one skill's cases
```

## Layout

One folder per case, named for the skill it tests followed by the behaviour: `<skill>-<behaviour>`. A case holds:

- `prompt.md`: run limits in the frontmatter, and the message a person would type as the body.
- `graders/*.md`: one check per file. Give each case a grader on the result and a grader on the steps taken.
- `case.yaml`, only when the case needs fixtures (`context.add_dirs`).
- `resources/`: fixtures the agent may read. `add_dirs` only grants the read and never tells the agent where the folder is, so the prompt names the fixture by its path inside the plugin directory (`evals/<case>/resources/<file>`).

`results/` is written by each run and is not committed.

## Adding a case

A fix for a skill defect ships with one case that reproduces the defect: it fails before the fix and passes after. Name it for the skill and the behaviour that was wrong.

Runs cannot write files or run shell commands unless the command grants it. The `grill` case grades the Write call to `GLOSSARY.md` itself, and a tool that is not granted is withheld from the model, so run it with `--allow-tools Write Edit`, as the workflow does.

## CI

`.github/workflows/evals.yml` runs the suite on the Changesets release pull request and on manual dispatch, never on every pull request. It needs the repository secret `ANTHROPIC_API_KEY` and skips with a notice when it is absent.
