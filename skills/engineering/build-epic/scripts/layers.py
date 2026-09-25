#!/usr/bin/env python3
"""layers.py: group an epic's sub-issues into dependency layers.

Input (stdin): JSON lines as printed by `ready.sh <epic#> --all`, or any objects with
`url` (or `number`) and `openBlockers` (list of issue URLs, or numbers). Closed blockers
must already be filtered out (ready.sh does that). URLs keep multi-repo epics unambiguous.

Output: JSON `{"layers": [[<id>, <id>], [<id>], …], "cycle": [..]}` where <id> is the ticket's
url if present, else its number; layer n holds every
ticket whose open blockers all sit in layers < n. Tickets left over after no layer can be
formed are in a cycle (or blocked by an issue outside the epic) and are listed in `cycle`.

    ready.sh 42 --all | layers.py
    layers.py < tickets.jsonl
"""
from __future__ import annotations

import json
import sys


def ident(t: dict):
    return t.get("url") or t["number"]


def layers(tickets: list[dict]) -> tuple[list[list], list]:
    ids = {ident(t) for t in tickets}
    # Blockers outside the epic still block, but can never be "placed"; keep them as edges.
    blockers = {ident(t): set(t.get("openBlockers") or []) for t in tickets}
    placed: set = set()
    result: list[list] = []
    remaining = set(ids)
    while remaining:
        layer = sorted((n for n in remaining if blockers[n] <= placed), key=str)
        if not layer:
            break
        result.append(layer)
        placed.update(layer)
        remaining.difference_update(layer)
    return result, sorted(remaining)


def main() -> int:
    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"layers": [], "cycle": []}))
        return 0
    tickets = []
    try:
        data = json.loads(raw)
        tickets = data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        tickets = [json.loads(line) for line in raw.splitlines() if line.strip()]
    result, cycle = layers(tickets)
    print(json.dumps({"layers": result, "cycle": cycle}))
    return 1 if cycle else 0


if __name__ == "__main__":
    sys.exit(main())
