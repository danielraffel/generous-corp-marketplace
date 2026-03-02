# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Generous Corp Marketplace is the official marketplace for Claude Code plugins and Agent Skills (SKILL.md). It contains plugins (installed via Claude Code's plugin system) and skills (loaded by Claude Code or OpenAI Codex).

**Repository structure:**
- `plugins/<name>/` — Claude Code plugins (each has `.claude-plugin/plugin.json`, commands, and often an `index.html` homepage)
- `skills/<name>/` — Agent skills (each has a `SKILL.md`)
- `.github/ISSUE_TEMPLATE/` — GitHub issue form templates (bug + feature per project)

## Adding a New Plugin or Skill

When adding a new plugin or skill to the marketplace, complete **all** of the following:

1. **Main README.md** — Add entries to:
   - "Plugins Available" or "Skills Available" section
   - "Installation" section (add install command block for plugins)
   - "Links" section (add homepage link for plugins)

2. **GitHub issue templates** — Create two files in `.github/ISSUE_TEMPLATE/`:
   - `<name>-bug.yml` — Bug report template with labels `["bug", "<name>"]`
   - `<name>-feature.yml` — Feature request template with labels `["enhancement", "<name>"]`
   - Follow the existing templates as examples for form fields

3. **Project README** — Add a "Feedback & Issues" section to the project's `README.md` (or `SKILL.md` for skills without a README):
   ```markdown
   ## Feedback & Issues

   - [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=<name>-bug.yml)
   - [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=<name>-feature.yml)
   ```

4. **Plugin homepage FAQ** (if the project has an `index.html`) — Add a FAQ item:
   - Question: "How do I report a bug or request a feature?"
   - Answer: Links to both the bug and feature request templates

5. **GitHub labels** — Create labels on the repository for the project name (e.g., `worktree-manager`, `chainer`) so issue templates can auto-apply them
