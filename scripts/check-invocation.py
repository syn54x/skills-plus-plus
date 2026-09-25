#!/usr/bin/env python3
"""Enforce the invocation model in .agents/invocation.md.

1. A skill's `disable-model-invocation: true` frontmatter and its
   `agents/openai.yaml` `allow_implicit_invocation: false` must agree.
2. Every skill another skill or agent calls (`Call the Skill tool with "x"`,
   or an agent's `skills:` preload) must exist and be model-invoked. A
   user-invoked skill can only be reached by the human typing it.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CALL = re.compile(r"[Cc]all the Skill tool (?:with|twice, for|for) ((?:[\"`][\w-]+[\"`](?:,? and |, )?)+)")
NAME = re.compile(r"[\"`]([\w-]+)[\"`]")


def frontmatter(path: Path) -> str:
    text = path.read_text()
    if not text.startswith("---\n"):
        return ""
    return text[4 : text.find("\n---", 4)]


def field(fm: str, key: str) -> str | None:
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.M)
    return m.group(1).strip().strip('"') if m else None


errors: list[str] = []
skills: dict[str, bool] = {}  # name -> user-invoked
dirs: list[Path] = []

for skill_md in sorted((ROOT / "skills").glob("*/*/SKILL.md")):
    if skill_md.parts[-3] == "deprecated":
        continue
    rel = skill_md.relative_to(ROOT)
    fm = frontmatter(skill_md)
    name = field(fm, "name")
    if name != skill_md.parent.name:
        errors.append(f"{rel}: name '{name}' does not match its directory")
        continue
    user = field(fm, "disable-model-invocation") == "true"
    skills[name] = user
    dirs.append(skill_md.parent)

    yaml = skill_md.parent / "agents" / "openai.yaml"
    if not yaml.exists():
        errors.append(f"{rel}: missing agents/openai.yaml")
        continue
    implicit_off = re.search(r"allow_implicit_invocation:\s*false", yaml.read_text()) is not None
    if user != implicit_off:
        errors.append(
            f"{rel}: disable-model-invocation={str(user).lower()} but openai.yaml "
            f"allow_implicit_invocation={'false' if implicit_off else 'true or unset'}"
        )


def check_target(where: str, target: str) -> None:
    if target not in skills:
        errors.append(f"{where}: calls unknown skill '{target}'")
    elif skills[target]:
        errors.append(
            f"{where}: calls '{target}', which is user-invoked; only the human can run it "
            f"(tell the user to run /{target}, or make it model-invoked)"
        )


sources = [p for d in dirs for p in d.rglob("*.md")] + sorted((ROOT / "agents").glob("*.md"))
for path in sources:
    rel = path.relative_to(ROOT)
    for lineno, line in enumerate(path.read_text().splitlines(), 1):
        for m in CALL.finditer(line):
            for target in NAME.findall(m.group(1)):
                check_target(f"{rel}:{lineno}", target)
    if path.parent.name == "agents" and path.parent.parent == ROOT:
        fm = frontmatter(path)
        block = re.search(r"^skills:\n((?:\s+-\s*.+\n?)+)", fm, re.M)
        for target in re.findall(r"-\s*([\w-]+)", block.group(1)) if block else []:
            check_target(f"{rel} (skills: preload)", target)

if errors:
    print("\n".join(f"error: {e}" for e in errors), file=sys.stderr)
    sys.exit(1)
print(f"ok: {len(skills)} skills, invocation flags agree, every Skill-tool call targets a model-invoked skill")
