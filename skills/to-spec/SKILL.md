---
name: to-spec
description: Write up the plan this conversation settled as an Epic issue on the issue tracker, with no new interview.
disable-model-invocation: true
---

Write the plan this conversation has settled as an **Epic**: one issue whose body is the spec and serves as the PRD. This is synthesis. Put one question to the person, the test seams in step 3, and no other. A choice the plan needs but nobody made is not yours to make: stop and ask the person to run `/grill` here first.

## 1. Gather the domain

Read the parts of the codebase the plan touches, enough to describe today's behaviour correctly. Then read the glossary and the ADRs for those areas; `domain-modeling` explains how to find them. The spec uses the glossary's words and sides with the ADRs. When the plan contradicts an ADR, stop and quote the ADR.

When the conversation settled a term or a lasting decision that never reached the glossary or an ADR, call the Skill tool with "domain-modeling" and record it first.

Done when you can name the glossary terms the spec will use and every ADR it touches.

## 2. Read the mode

Find the **Routing block** (`<!-- sdd-routing -->`) in `CLAUDE.md` or `AGENTS.md` and read its Mode line: `org` or `labels-only`. With no block, ask the person to run `/setup-spp` and stop.

## 3. Confirm the seams

Call the Skill tool with "codebase-design" for the words. Sketch the points through which tests of the feature will enter the code. Prefer a seam that exists over a new one, and the highest seam that can show the behaviour. A new seam goes as high as it can. Fewer seams is better, and one is ideal.

Show the person the seams with a recommendation and what each one covers, then wait. Done when the person has confirmed or corrected them. Write nothing before that.

## 4. Write the body

Read [`EPIC-TEMPLATE.md`](EPIC-TEMPLATE.md) and fill each section from the conversation. Nothing goes in that the person did not say or the code and docs did not show. A thin section stays thin. An invented story to fill space is a defect.

Done when every section of the template has a heading and either content or a line saying none.

## 5. Publish

Write the body to a file made with `mktemp`, then create the issue with the `gh` CLI. In `org` mode add `--type Epic`; in `labels-only` mode leave the type flag out:

```bash
gh issue create --title "<what the Epic delivers>" --label ready-for-agent --type Epic --body-file "$BODY"
```

The one label is `ready-for-agent`; no triage follows. When the org has no `Epic` type, the create fails: report that and ask the person to run `/setup-spp`.

Done when `gh issue view` on the new number shows the label and, in `org` mode, the Epic type.

## 6. Hand on

Give the person the issue URL and ask them to run `/to-tickets` next, in this same conversation. Start no further step yourself.
