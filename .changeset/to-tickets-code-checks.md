---
"mattpocock-skills": minor
---

to-tickets (SDD pass): publishing the Sub-issues now removes `ready-for-agent` from the epic in both org and labels-only mode, so the readiness rule no longer matches the epic itself (#10). The consistency pass gains four code checks, each fixed inline or the ticket published `needs-info`: every Test scenario's data exists and every Error path names an error the code raises or the ticket produces; tickets that change user-visible output list the tests, snapshots and example scripts pinning it under Files owned; callers of a changed signature are listed as Modify, with the new entries going through the collision rule (#25); and every Verify command resolves, with commands that do not depend on the ticket's new code baselined green on the default branch (#29). implement-issue's `Verify block corrected:` line is now required, and review-pr reports a silent correction or a missing line as an Important quality finding (#29).
