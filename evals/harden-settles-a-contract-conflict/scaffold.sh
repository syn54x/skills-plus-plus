#!/usr/bin/env bash
# The runner calls this with the run's working directory as cwd, once per run in each arm.
set -euo pipefail
cp -R "$(dirname "$0")/resources/." .
