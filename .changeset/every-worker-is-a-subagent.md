---
"@syn54x/spp": minor
---

Every worker is now a subagent. The `desktop` and `bg` Drivers are gone, and so is `--driver`: `spp dispatch <issue>` takes no flags and writes the brief without starting `claude --bg`, `spp plan` no longer records or renders a Driver, and `spp next` no longer puts a `driver` on its `dispatch` actions. Passing `--driver` to either command is a usage error. `building` no longer asks which Driver to use at the first Wave; its approval question now comes first in its message, so a parent session sees it. An Epic whose plan comment still records a Driver builds as before, with subagent workers.
