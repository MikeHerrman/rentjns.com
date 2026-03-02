# JNS Website (Work-in-Progress)

**Live preview:** https://rentjnscom.netlify.app  
**Repo:** https://github.com/MikeHerrman/rentjns.com

## Purpose

Marketing site for JNS (rentals/events/contact). Built as a static site now; can evolve to a build pipeline later.

## Current Architecture vs Future Plan

The current live site is a static HTML/CSS/JS site deployed on Netlify, with a small Netlify Function for the events feed.

Some top-level folders in this repo such as `controllers/`, `models/`, `routes/`, `public/`, and `util/` are being kept intentionally for a later phase of the project. The plan is to eventually build a custom CMS/admin backend using Node.js, Express, MongoDB, and an MVC-style structure.

Until that backend work starts, treat the current site as static-first:

- `index.html`, `views/`, `css/`, `js/`, and `assets/` drive the live site
- `netlify/functions/` contains the current server-side function usage
- The MVC-style folders are reserved for future backend/CMS development and are not part of the current deployed app flow

---

## Local Development

This is a static HTML/CSS/JS site (no build step).

### Static preview (no functions)

```bash
python -m http.server 8000
```

### Preview with Netlify Functions

Use this when working on anything that calls `/.netlify/functions/*`:

```bash
npx netlify dev
```

---

## Update & Deploy Workflow (quick)

### Option A: Direct push to `main` (only for very safe changes)

Use this for simple copy edits you already verified locally and are comfortable publishing immediately.

```bash
git status
git add <file(s)>
git commit -m "Describe your change"
git push
```

> Tip: Prefer staging specific files. Only use `git add -A` when you’re sure _everything_ belongs in the commit.

After pushing, refresh the live site and confirm nothing is broken.

---

## Update & Deploy Workflow (recommended: Branch + PR + Deploy Preview)

Use this for anything that could break the live site (JS, links/nav, assets/images, functions, redirects).

### 1) Create a branch

```bash
git checkout -b copy/<short-description>
# examples:
# git checkout -b copy/about-blurb
# git checkout -b fix/image-paths
# git checkout -b fix/events-function
```

### 2) Stage and commit (prefer explicit files)

```bash
git status
pwsh -File .\scripts\validate-static.ps1
git add <file(s)>
git commit -m "Describe your change"
```

### 3) Push the branch (first push sets upstream)

```bash
git push -u origin HEAD
```

### 4) Open a Pull Request (PR)

In GitHub, create a PR from your branch into `main`.

### 5) Test the Netlify Deploy Preview

On the PR page, open the **Deploy Preview** link and verify the change in the real Netlify environment.

### 6) Merge + cleanup

Merge the PR in GitHub, then delete the branch in GitHub.

Back locally:

```bash
git checkout main
git pull
git branch -d copy/<short-description>
```

---

## Netlify Notes

- **Publish directory:** `.` (repo root)
- **Functions directory:** `netlify/functions`
- Prefer calling functions with relative paths (example): `/.netlify/functions/fetch-ics`

---

## Lightweight Validation

Before committing HTML, asset, metadata, or link changes, run:

```powershell
pwsh -File .\scripts\validate-static.ps1
```

This validator is intentionally lightweight. It checks for:

- missing local `src` and `href` file references in `index.html` and `views/*.html`
- missing or duplicate canonical tags
- placeholder canonical domains such as `yourdomain.com`

Quick pre-push checklist:

- Run `pwsh -File .\scripts\validate-static.ps1`
- Preview locally with `python -m http.server 8000` or `npx netlify dev` if functions are involved
- Click through the page you changed and confirm images, nav, and key links still work
- If metadata changed, verify the page still has one correct canonical URL

---

## Codex Rules (quick)

If using Codex to help with git operations:

- Never push directly to `main` unless explicitly asked
- Always show `git status` and summarize changes (`git diff --name-only`) before staging/committing
- Do not use `git add -A` unless explicitly requested
- No force push
- Confirm current branch before pushing (`git branch --show-current`)
