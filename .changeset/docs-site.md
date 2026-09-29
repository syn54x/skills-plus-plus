---
"mattpocock-skills": patch
---

Add the docs site. `docs/` now builds with Zensical (`zensical.toml`, a pinned `uv` toolchain in `pyproject.toml` and `uv.lock`) and deploys to GitHub Pages at `https://skills.x54.sh` from `.github/workflows/publish-docs.yml` on every push to `main` that touches the docs inputs. `docs/index.md` is the landing and install page, and carries the canonical install block. `scripts/check-plugin-skills.sh` now also requires a nav entry in `zensical.toml` for every promoted skill, and CI and prek run a strict build so a broken link or anchor fails before merge.
