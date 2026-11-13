#!/usr/bin/env bash
# The runner calls this with the run's working directory as cwd, once per run in each arm.
set -euo pipefail
cp -R "$(dirname "$0")/resources/." .
# The panel copies the plugin's Persona file in (step 2), so the case reads the one the plugin ships.
cp "$(dirname "$0")/../../skills/review-panel/PERSONAS.md" spp-panel-60/PERSONAS.md
