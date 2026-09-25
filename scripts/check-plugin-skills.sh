#!/usr/bin/env bash
# Fail if the promoted set and its three listings disagree (see CLAUDE.md).
# Promoted = every skills/engineering/*/ and skills/productivity/*/ with a SKILL.md.
# Each promoted skill must be in .claude-plugin/plugin.json's (and .cursor-plugin/plugin.json's) "skills" array, have a
# docs page at docs/<bucket>/<name>.md, and be linked from README.md. Nothing outside
# the promoted buckets may appear in any of the three.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
manifest=.claude-plugin/plugin.json

promoted=$(find skills/engineering skills/productivity -mindepth 2 -maxdepth 2 -name SKILL.md -exec dirname {} \; | sort)
listed=$(jq -r '.skills[]?' "$manifest" | sed 's#^\./##; s#/$##' | sort)
docs=$(find docs/engineering docs/productivity -name '*.md' | sed 's#^docs/#skills/#; s#\.md$##' | sort)
readme=$(grep -oE '\./skills/[a-z-]+/[a-z0-9-]+/SKILL\.md' README.md | sed 's#^\./##; s#/SKILL\.md$##' | sort -u)

status=0
report() { # <message> <lines>
  [ -z "$2" ] && return 0
  echo "error: $1" >&2
  echo "$2" | sed 's/^/  /' >&2
  status=1
}

report "promoted but not listed in $manifest:" "$(comm -23 <(echo "$promoted") <(echo "$listed"))"
report "listed in $manifest but not a promoted skill:" "$(comm -13 <(echo "$promoted") <(echo "$listed"))"
if [ -f .cursor-plugin/plugin.json ]; then
  cursor=$(jq -r '.skills[]?' .cursor-plugin/plugin.json | sed 's#^\./##; s#/$##' | sort)
  report "promoted but not listed in .cursor-plugin/plugin.json:" "$(comm -23 <(echo "$promoted") <(echo "$cursor"))"
  report "listed in .cursor-plugin/plugin.json but not a promoted skill:" "$(comm -13 <(echo "$promoted") <(echo "$cursor"))"
fi
report "promoted but no docs page at docs/<bucket>/<name>.md:" "$(comm -23 <(echo "$promoted") <(echo "$docs"))"
report "docs page for a skill that is not promoted:" "$(comm -13 <(echo "$promoted") <(echo "$docs"))"
report "promoted but not linked from README.md:" "$(comm -23 <(echo "$promoted") <(echo "$readme"))"
report "README.md links a skill outside the promoted buckets:" "$(comm -13 <(echo "$promoted") <(echo "$readme"))"

[ "$status" -eq 0 ] && echo "ok: $(echo "$promoted" | wc -l | tr -d ' ') promoted skills listed in $manifest, docs/ and README.md"
exit "$status"
