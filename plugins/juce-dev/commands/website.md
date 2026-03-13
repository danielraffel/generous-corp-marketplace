---
description: Create or update a GitHub Pages download page for your plugin
argument-hint: "[--regenerate] [--no-github-link] [--help]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Edit
  - Write
---

# Website — GitHub Pages Download Page

Create a GitHub Pages download page for your plugin. Sets up a `gh-pages` branch with a responsive landing page showing your plugin name, description, and download buttons. Download links are automatically updated when you publish (`/juce-dev:build publish` or `/juce-dev:ci publish`).

## Arguments

- (no args) — Create a gh-pages branch with the website template (or report if one already exists)
- `--regenerate` — Force regenerate the page from the template (overwrites existing)
- `--no-github-link` — Omit the GitHub source link (useful for private repos)
- `--help` — Show help reference

**Examples:**
```
/juce-dev:website                   # Set up GitHub Pages download page
/juce-dev:website --no-github-link  # Private repo — no source link
/juce-dev:website --regenerate      # Rebuild page from template
/juce-dev:website --help            # Show this reference
```

## Implementation

### Step 0: Handle --help

If `--help` is in the arguments, display this reference and stop:

```
juce-dev:website — Create a GitHub Pages download page

USAGE:
  /juce-dev:website                   Set up download page
  /juce-dev:website --no-github-link  Omit GitHub source link
  /juce-dev:website --regenerate      Rebuild from template

WHAT IT CREATES:
  A gh-pages branch with a single index.html — your plugin name,
  description, and download buttons for macOS and Windows.

  • Light and dark mode
  • Open Graph + Twitter Card meta tags
  • Download buttons start as "Coming Soon" stubs
  • Buttons auto-activate when you first publish
  • URLs auto-update on subsequent publishes

HOW DOWNLOADS UPDATE:
  When you run /juce-dev:build publish or /juce-dev:ci publish,
  the publish pipeline calls update_download_links.sh which:
  1. First publish: replaces "Coming Soon" stubs with active buttons
  2. Later publishes: updates version numbers in existing URLs

  This happens automatically — no manual website editing needed.

CUSTOMIZATION:
  The page is intentionally simple. After creation, you can edit
  index.html on the gh-pages branch to add features, screenshots,
  or other content. Your customizations are preserved — only the
  download button blocks (between marker comments) are touched
  during publish updates.

SOCIAL SHARING:
  Add a 1200x630px image to web-images/og-image.png on gh-pages
  for rich previews in iMessage, Slack, Discord, and Twitter/X.

YOUR PAGE URL:
  https://<github-user>.github.io/<repo>/
```

### Step 1: Verify Project & Tools

1. Check that `.env` exists and load it.
2. Verify required variables: `GITHUB_USER`, `GITHUB_REPO`, `PROJECT_NAME`, `PRODUCT_NAME`, `DEVELOPER_NAME`, `PLUGIN_DESCRIPTION`
   - If any are missing, read them from `.env` or prompt the user.
3. Check that `gh` CLI is installed and authenticated.
4. Check that a GitHub remote exists.
5. Check that `templates/website.html.template` exists.
   - If not, tell the user: "Website template not found. Make sure you're using the latest JUCE-Plugin-Starter template."

### Step 2: Check for Existing gh-pages

Check if a gh-pages branch already exists:
```bash
git rev-parse --verify gh-pages 2>/dev/null || git rev-parse --verify origin/gh-pages 2>/dev/null
```

**If gh-pages exists AND `--regenerate` was NOT passed:**
```
A gh-pages branch already exists with your download page.

  URL: https://<GITHUB_USER>.github.io/<GITHUB_REPO>/
  Branch: gh-pages

Download links update automatically when you publish.
Use --regenerate to rebuild the page from the template.
```
Stop here.

**If gh-pages exists AND `--regenerate` was passed:**
Continue to Step 3 (will overwrite existing index.html).

**If gh-pages does NOT exist:**
Continue to Step 3.

### Step 3: Generate index.html from Template

1. Read `templates/website.html.template`
2. Replace template variables:
   - `{{PRODUCT_NAME}}` → value from .env
   - `{{PLUGIN_DESCRIPTION}}` → value from .env
   - `{{DEVELOPER_NAME}}` → value from .env
   - `{{GITHUB_USER}}` → value from .env
   - `{{GITHUB_REPO}}` → value from .env

3. If `--no-github-link` was passed, remove the GitHub link block:
   - Remove everything between `<!-- GITHUB-LINK-START -->` and `<!-- GITHUB-LINK-END -->` (inclusive)

4. Store the generated HTML.

### Step 4: Create or Update gh-pages Branch

**If creating new gh-pages branch:**
```bash
# Create orphan branch
git checkout --orphan gh-pages
git rm -rf . 2>/dev/null || true
# Write index.html
# git add index.html
# git commit -m "Create download page"
# git push -u origin gh-pages
# Switch back to original branch
git checkout -
```

**If updating existing gh-pages (--regenerate):**
```bash
# Use a temporary worktree
TMPDIR=$(mktemp -d)
git worktree add "$TMPDIR" gh-pages
# Write new index.html to $TMPDIR/index.html
# cd $TMPDIR && git add index.html && git commit -m "Regenerate download page" && git push
# cd back && git worktree remove $TMPDIR
```

### Step 5: Enable GitHub Pages

Check if GitHub Pages is already enabled:
```bash
gh api repos/<GITHUB_USER>/<GITHUB_REPO>/pages --jq '.source.branch' 2>/dev/null
```

If not enabled, enable it:
```bash
gh api repos/<GITHUB_USER>/<GITHUB_REPO>/pages -X POST \
  -f source.branch=gh-pages -f source.path=/
```

If it's enabled but pointing to a different branch, update it:
```bash
gh api repos/<GITHUB_USER>/<GITHUB_REPO>/pages -X PUT \
  -f source.branch=gh-pages -f source.path=/
```

### Step 6: Report

Display:
```
Download page created!

  URL:    https://<GITHUB_USER>.github.io/<GITHUB_REPO>/
  Branch: gh-pages

Download buttons currently show "Coming Soon."
They'll activate automatically when you first publish:
  /juce-dev:build publish   (local publish)
  /juce-dev:ci publish      (CI/CD publish)

To customize the page, edit index.html on the gh-pages branch.
Your changes are preserved — only download button blocks are
updated during publish.
```
