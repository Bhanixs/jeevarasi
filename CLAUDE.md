# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

```bash
npm run dev   # starts Express server → http://localhost:3000
```

Requires a `.env` file — copy `.env.example` and fill in at minimum `SUPABASE_URL`, `SUPABASE_ANON`, and `SUPABASE_SERVICE`.

## Architecture

**Stack:** Vanilla HTML/CSS/JS frontend · Node.js + Express backend · Supabase (PostgreSQL via direct REST API — no Supabase JS SDK)

### Single API surface

All backend operations go through one endpoint: `/api/admin?action=<action>` — different `action` values for each feature, all HTTP methods supported (GET / POST / PATCH / DELETE).

### Key files

| File | Role |
|---|---|
| `server.js` | Express server, all route handlers — the local dev entry point |
| `api/admin.js` | Vercel serverless function entry point in production. Also contains all DB helpers (`dbFetch`, `sbUrl`, `sbAnon`, `sbService`), notification helpers (`notifyEmail`, `notifyWhatsApp`), and auth check (`verifyAuth`). |
| `js/main.js` | Contact form + newsletter form + review form submit handlers; loads approved reviews on homepage |
| `js/public-content.js` | Fetches and renders events, projects, gallery dynamically on public pages |
| `js/admin.js` | Full admin panel logic — CRUD for all tables, session/token management |
| `js/stats-loader.js` | Fetches stats from API, drives counter animation |

### Supabase access pattern

All DB calls go through `dbFetch(table, method, body, queryString)` in `api/admin.js`. GET requests use `SUPABASE_ANON` key; writes use `SUPABASE_SERVICE` key. There is no Supabase JS SDK — it's raw `fetch` against the Supabase REST API.

### Auth

- **server.js (local dev):** Login returns a random hex token stored in-memory (cleared on restart); `isAuthed(req)` checks the in-memory token set.
- **api/admin.js (Vercel):** Uses a single hardcoded `TOKEN` constant; `verifyAuth(req)` compares the Bearer token directly.

Both store the token in `sessionStorage` on the client, retrieved by `getToken()` in `js/admin.js`.

### Database tables

`jeevarasi_stats` · `jeevarasi_events` · `jeevarasi_projects` · `jeevarasi_fundraising` · `jeevarasi_contacts` · `jeevarasi_newsletter` · `jeevarasi_event_registrations` · `jeevarasi_reviews`

## Adding a New Feature (Pattern)

1. **SQL:** Create `supabase-<feature>-migration.sql`, run it in the Supabase SQL editor
2. **Backend:** Add the table to `DB_TABLES` and `DB_ORDER` in both `server.js` and `api/admin.js`. Add a public-facing action (e.g. `action=submit_thing`) before the auth check in the POST handler in `server.js` and in the `switch` block in `api/admin.js`. Mirror all changes in both files — they must stay in sync.
3. **Public form:** Add form HTML to the relevant `.html` file; add submit handler in `js/main.js` following the `fetch('/api/admin?action=...')` + `.then(r => r.json())` pattern
4. **Admin panel:** Add a tab button and `<div id="tab-<name>">` panel in `admin.html`; add `load<Name>()` + `render<Name>Table()` in `js/admin.js`; register the loader in the `loaders` object inside the `switchTab()` function

## Deployment

Configured for Vercel (`vercel.json`). In production, `api/admin.js` is the Vercel serverless function; `server.js` handles local dev only. **Both files must be kept in sync when adding new features.**
