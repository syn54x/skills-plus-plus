#!/usr/bin/env python3
"""sdd-by-cause.py: count fix-round findings by Law tag source for the retro's fix_rounds.by_cause.

stdin:  a JSON array of review bodies (strings or null), every review on the epic's ticket PRs.
stdout: the by_cause object, {"<key>": <count>}, or null for an empty array.
exit 2: stdin is anything else (the retro JSON, say), with one line on stderr and nothing on stdout,
        so a mis-fed run never passes as "no failing review".

A FAIL review is one whose body contains "## Spec: FAIL" or "## Quality: FAIL". Every line in it
that starts "- Critical", "- Important" or "- Minor" is one finding, keyed by its Law tag
(review-pr §4: "- <severity> · [<source>#<id>] · ..."): a repo path or ADR keeps its source,
ticket keeps its section, epic, cited, skill and none collapse, and no tag counts as none.
ADDRESSED / NOT ADDRESSED lines start with neither severity, so they never count.
"""
import json
import re
import sys

FAIL = re.compile(r"## (Spec|Quality): FAIL")
FINDING = re.compile(r"^- (Critical|Important|Minor)\b(.*)")
TAG = re.compile(r"^\s*·\s*\[([^\]]+)\]")


def key_of(rest):
    """Dropping the id collapses epic, cited, skill and none, and keys a repo path by its file."""
    tag = TAG.match(rest)
    if not tag:
        return "none"
    source, _, ident = tag.group(1).strip().partition("#")
    if source == "ticket" and ident:
        return "ticket#" + ident.strip()
    return source


def by_cause(bodies):
    if not bodies:
        return None
    counts = {}
    for body in bodies:
        body = body or ""
        if not FAIL.search(body):
            continue
        for line in body.splitlines():
            m = FINDING.match(line)
            if m:
                k = key_of(m.group(2))
                counts[k] = counts.get(k, 0) + 1
    return counts


def read_bodies(stream):
    """Return the review bodies on stream, or exit 2 when stream is not an array of strings or null."""
    try:
        bodies = json.load(stream)
    except ValueError:
        bodies = None
    if not isinstance(bodies, list) or not all(b is None or isinstance(b, str) for b in bodies):
        print("sdd-by-cause.py: stdin must be a JSON array of review bodies (see RETRO.md)", file=sys.stderr)
        sys.exit(2)
    return bodies


if __name__ == "__main__":
    print(json.dumps(by_cause(read_bodies(sys.stdin)), sort_keys=True))
