# Private HS Consultant — Static MVP

Two-page static site deployable on Netlify with zero-backend form collection via Netlify Forms and an optional Netlify Function to append CSV submissions to GitHub.

## Quick Start

1) Fork this repo to your GitHub account.
2) In Netlify: New site → Import from Git → choose your fork.
3) Build settings:
   - Build command: (none)
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4) Deploy. Visit your site, click “Start Survey,” submit the form.

## Pages

- `/` → `public/index.html`: Minimal hero with a centered CTA to the survey. Bottom content includes a static, formatted “What we offer” section.
- `/survey` → `public/survey.html`: User info form with HTML5 validation.
- `/success` → `public/success.html`: Shown after a successful Netlify Forms submission.

## Content

- To customize the “What we offer” section, edit `public/index.html` directly.
- Optional: If you prefer content from `assets/doc/index.txt`, add `data-inject="true"` to the `#index-doc` element in `public/index.html` and the site JS will inject that text (note: injection renders as paragraphs, not lists).
- Optionally add/edit `assets/doc/survey_intro.txt` to show a short lead-in above the survey form.

## Data Collection (Primary: Netlify Forms)

- The `<form>` in `public/survey.html` is wired for Netlify Forms (`data-netlify="true"`).
- View submissions in Netlify: Site → Forms → `survey`.
- Export CSV from the Netlify UI: Forms → `survey` → Export CSV (yields `submissions.csv`).

## Optional: Append to GitHub CSV via Netlify Function

If you prefer a fixed filename in-repo CSV (`data/submissions.csv`) updated by a function:

1) Set Netlify environment vars (Site → Settings → Environment → Environment variables):
   - `GITHUB_TOKEN` (with `repo` write scope)
   - `GITHUB_OWNER` (e.g., `your-user-or-org`)
   - `GITHUB_REPO` (e.g., `your-repo-name`)
   - `GITHUB_BRANCH` (e.g., `main`)
2) In `public/survey.html`, add `data-use-function="true"` to the `<form name="survey">` element.
3) The site JS will intercept submit and POST JSON to `/.netlify/functions/append-csv`, which appends a sanitized row to `data/submissions.csv` via the GitHub Content API.

Notes:
- CSV safety: Cells are quoted, CR/LF removed, and any leading `=`, `+`, `-`, or `@` gets prefixed with `'` to prevent spreadsheet formula injection.
- If `data/submissions.csv` does not exist, the function creates it with a header row.

## File Tree

```
/assets/doc/index.txt
/assets/doc/survey_intro.txt   (optional)
/data/                         (contains submissions.csv when function writes)
/public/
  index.html
  survey.html
  success.html
  css/styles.css
  js/main.js
/netlify/
  functions/append-csv.js      (optional)
netlify.toml
AGENTS.md
WORKLOG.md
.gitignore
```

## Local Changes

- Edit the `.txt` files in `assets/doc/` for content.
- Edit `public/survey.html` to add/remove fields; keep `name` attributes stable if you rely on the optional function.
- Keep `public/js/main.js` minimal; it only enhances content loading and optional function submission.

## Exporting CSV (Netlify Forms)

1) In Netlify, navigate to your site → Forms → `survey`.
2) Click Export → CSV to download `submissions.csv`.

## Support

Open an issue in your fork or adapt as needed. The default path requires no backend.
