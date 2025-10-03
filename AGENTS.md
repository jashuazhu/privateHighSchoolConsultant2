# AGENTS.md — Private HS Consultant (Static MVP)

Scope: Entire repository.

Purpose: Shared guidance for agents/humans working in this repo. Keep the site fully static by default (Netlify Forms), with an optional Netlify Function to append CSV rows to GitHub.

Project Layout

- `public/` is the published root on Netlify.
- `assets/doc/index.txt` is injected at the bottom of `public/index.html`.
- `assets/doc/survey_intro.txt` (optional) is injected above the form on `public/survey.html` if present.
- `netlify/functions/append-csv.js` is optional, disabled by default.
- `data/` is where `submissions.csv` will live if you enable the function path (committed via the GitHub API).

Authoring Rules

- No frameworks; plain HTML5, vanilla CSS, and light JS only.
- Keep pages accessible and semantic. Use proper labels and `aria-live` for form status.
- Do not add build steps or external dependencies unless explicitly requested.
- Keep UX minimal and responsive.

Content Injection

- Index page bottom content comes from `assets/doc/index.txt`.
- Survey page optional lead-in comes from `assets/doc/survey_intro.txt` if the file exists.
- The client code (`public/js/main.js`) fetches these `.txt` files and converts line breaks to paragraphs.

Forms: Two Modes

1) Default (recommended): Netlify Forms
   - `public/survey.html` contains `<form name="survey" method="POST" data-netlify="true" netlify-honeypot="bot-field">` and the hidden input `<input type="hidden" name="form-name" value="survey">`.
   - Submissions are collected by Netlify. Export CSV from the Netlify UI (Forms → survey → Export CSV).
   - The form redirects to `/success` by default.

2) Optional: Netlify Function `append-csv`
   - Enable by adding `data-use-function="true"` to the survey form tag in `public/survey.html`.
   - When present, `public/js/main.js` intercepts submit and POSTs JSON to `/.netlify/functions/append-csv`.
   - The function appends a sanitized row to `data/submissions.csv` in this GitHub repo via the GitHub Content API.
   - Required Netlify environment variables:
     - `GITHUB_TOKEN` (repo write scope), `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`.
   - CSV is sanitized: quotes doubled, commas preserved via quoting, newlines stripped, and any cell beginning with `=`, `+`, `-`, or `@` is prefixed with `'` to prevent CSV injection.

Netlify

- `netlify.toml` sets `publish = "public"` and `functions = "netlify/functions"`.
- Redirects map `/survey` → `/survey.html` and `/success` → `/success.html`.

Code Style

- Keep edits minimal and targeted. No global refactors without need.
- Use clear names (no one-letter vars). Avoid inline comments unless requested.
- Prefer progressive enhancement: the form works without JS (Netlify Forms), and JS only adds optional function-submit.

Future Notes

- If a DB is introduced later, keep the same field names to minimize migration friction.
- Report generation is intentionally stubbed (disabled button). Build as a separate static/edge feature later.

