# Deepweb — Distraction-Free AI Research Workstation (Black & White Scaffold)

**Deepweb** is a minimal, production-ready scaffold (frontend + serverless backend) for a distraction-free AI research/workstation.
Designed for rapid iteration and deployment (Vite + React + Tailwind; Vercel serverless + Supabase optional), it includes a **DeepWeb-style Browser Mode** and strictly enforces a **single-AI-call session contract**: each Focus Session calls the server LLM **exactly once** and all subsequent "AI-like" behavior is done client-side from the returned session payload.

This README is tailored for GitHub — copy / paste into your repo root as `README.md`.

---

## Badges (replace links as needed)

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](#license)
[![Build Status](https://img.shields.io/badge/build-manual-black.svg)](#)
[![Vercel](https://img.shields.io/badge/deploy-vercel-black.svg)](#)

---

## Table of contents

* [What is Deepweb](#what-is-Deepweb)
* [Key Features](#key-features)
* [DeepWeb Browser Mode](#deepweb-browser-mode)
* [Single-AI-Call Contract](#single-ai-call-contract)
* [Tech Stack](#tech-stack)
* [Quickstart (dev)](#quickstart-dev)
* [Environment Variables](#environment-variables)
* [Supabase & Auth](#supabase--auth)
* [Design & UX Notes](#design--ux-notes)
* [Testing](#testing)
* [Deployment (Vercel)](#deployment-vercel)
* [Security & CORS Notes](#security--cors-notes)
* [Project Roadmap / Next Steps](#project-roadmap--next-steps)
* [Contributing](#contributing)
* [License](#license)
* [Contact](#contact)

---

## What is Deepweb

Deepweb is a minimal, black & white productivity web app scaffold built to host focused research sessions. Its goal is to let researchers, students and builders run monitored "focus sessions" where an LLM seeds a deterministic session payload once — then the client performs local similarity detection, summarization and synths without further remote LLM calls.

This repo gives you:

* Frontend React components (Vite + Tailwind, black & white theme)
* Serverless Python function `api/session_init.py` (Vercel-ready) that calls the provided `ask(prompt)` **exactly once**
* Supabase schema + RLS example
* IndexedDB/localSession scaffolding
* Drift detection hook and Jest tests
* DeepWeb Browser Mode components with Google-like auto-suggestions (note: may need proxy for CORS)

---

## Key Features

* Minimal, professional, pure **black (#000)** & **white (#fff)** theme with subtle grays.
* Left Control Panel (desktop) & bottom dock (mobile) UI layout.
* Reader that accepts URL/file or pasted text.
* **FocusSession** flow:

  * User composes `topicSourceText` → calls `/api/session_init` exactly once → receives JSON session payload → stored locally.
  * Client performs all session AI-like features locally (summaries, tag suggestions, drift detection).
* **Drift detection**: client-side similarity scoring using keywords/phrases and customizable matching rules.
* **DeepWeb Browser Mode** — distraction-free centered URL/search bar, sandboxed iframe, real Google suggestions, right-side sliding panel (history/bookmarks/settings).
* Supabase integration scaffolding for Google OAuth and cloud sync (optional).
* Jest tests for similarity function.

---

## DeepWeb Browser Mode

This scaffold includes a "Browser Mode" with these exact features:

* Pure black & white distraction-free interface.
* Centered URL/search bar at top.
* Load ANY external website inside a sandboxed `<iframe>`:
  `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`
* Navigation buttons: Back / Forward / Reload (minimal monochrome SVGs).
* True auto-suggestions using `https://suggestqueries.google.com/complete/search?client=firefox&q=...` (note: CORS caveat below).
* Right-side sliding panel (History / Bookmarks / Settings) — CSS-only slide animation, respects `prefers-reduced-motion`.
* New deliverables included:
  `BrowserShell.jsx`, `BrowserSearchBar.jsx`, `BrowserPanel.jsx`, `useGoogleSuggestions.js`.

---

## Single-AI-Call Contract (Important)

`api/session_init.py` adheres to the contract:

* Accepts POST JSON: `{ workspaceId, topicSourceText (≤2000 chars), userId (optional), sensitivity }`.
* Builds a concise prompt instructing the model to **output only JSON** matching the required `responseSchema`.
* Calls the provided `ask(prompt)` function **exactly once**.
* Attempts to parse model output as JSON:

  * On success → returns `200` with parsed JSON.
  * On parse failure → returns `400` with the raw model text to help debugging.

Why: ensures reproducible sessions and minimizes LLM usage & costs.

---

## Tech Stack

* Frontend: React (Vite), Tailwind CSS, plain JS/JSX hooks & components
* Backend: Vercel Serverless (Python) function `api/session_init.py`
* AI client snippet: provided Python `ask(prompt)` wrapper (uses `openai.OpenAI`)
* Optional cloud sync & auth: Supabase (Postgres + Auth)
* Tests: Jest (unit tests for similarity scoring)

---

## Quickstart (development)

1. Clone the repo:

   ```bash
   git clone <repo-url>
   cd Deepweb
   ```
2. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   ```
3. Add environment variables (see below).
4. Run dev:

   ```bash
   npm run dev
   ```
5. Run tests:

   ```bash
   npm test
   ```

> The provided code is scaffold-level. You’ll need to wire `index.html` / `main.jsx` and any missing Vite plumbing if not already present.

---

## Environment variables

Create a `.env` file (or set in Vercel) with:

```
A4F_API_KEY=<your-provider-api-key>
A4F_BASE_URL=https://api.a4f.co/v1   # optional, default used in scaffold
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>  # server-side only
```

**Important**: keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-only). `VITE_` prefixed vars are exposed to the browser and must be safe.

---

## Supabase & Auth

* Hook `useSupabaseAuth.js` is included for Google OAuth sign-in/out.
* `supabase/schema.sql` provides DDL for tables: `workspaces, clips, notes, focus_sessions, tasks`.
* Example RLS policies are provided (allow row access to `auth.uid()` and owners).
* You must configure Google OAuth Redirect URI inside your Supabase project (e.g. `https://your-domain.com/auth/callback`).

---

## Design & UX Notes

* Visual language: black & white only (high contrast). Tailwind-only styling; no external UI libs.
* Accessibility: keyboard-first shortcuts (e.g. Cmd/Ctrl+K), ARIA labels, `prefers-reduced-motion` supported for animations.
* Single AI call per Focus Session: all AI-like features once seeded are deterministic client-side template-driven.

---

## Testing

* `tests/similarity.test.js` contains Jest tests for the similarity scoring function.
* Run tests:

  ```bash
  npm test
  ```

---

## Deployment (Vercel)

1. Ensure `api/session_init.py` is at project root under `api/` (Vercel expects serverless functions there).
2. Push repo to GitHub and import project on Vercel.
3. In Vercel project settings, set the required environment variables (see above).
4. Deploy.

---

## Security & CORS Notes

* The browser suggestions endpoint (`suggestqueries.google.com`) may enforce CORS. In practice:

  * Option A (recommended): create a lightweight serverless proxy that fetches suggestions server-side and returns them to the client (bypasses CORS).
  * Option B: use the endpoint directly and accept that some browsers/origins may block requests.
* The iframe is sandboxed to prevent page breakout; do not remove the `sandbox` attribute in production.
* The `api/session_init.py` includes comments showing how to verify Supabase JWTs; implement robust server-side verification in production.

---

## Project Roadmap / Next Steps

* Add a serverless proxy for Google suggestions to eliminate CORS issues.
* Replace `localStorage` with `IndexedDB` (idb) for robust offline-first storage and larger payloads.
* Add workspace membership & sharing with Supabase RLS improvements.
* Add a small demo dataset and example sessions.
* Polish Reader extraction (Readability.js or server-side extraction).
* Add E2E tests for the FocusSession flow.

---

## Contributing

Contributions welcome! Suggested workflow:

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit & open a PR describing changes
4. Keep PRs focused and small

Please follow the existing black & white UI aesthetic and run tests before opening PRs.

---

## License

This project is open source under the **MIT License** — see `LICENSE` for details.

---

## Contact

Built by the repo author — open issues or PRs for bug reports, feature requests, or help. If you want me to generate the Vite glue (`index.html`, `main.jsx`, `package.json`) or a suggestions-proxy serverless function, say which and I’ll add it next.

---

Thanks — enjoy building a distraction-free research experience. Want me to generate the `package.json` + Vite entry files next so the scaffold runs out-of-the-box?
