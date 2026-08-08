# G.I.S.T. — Guided Inference Skill Trainer

An AI-powered vocabulary and reading comprehension assessment tool built for Malaysian primary school ESL students (Year 4–6).

G.I.S.T. asks students to work out unfamiliar words directly from context, guided by one of eight animal coach personas, never handed the answer outright. It includes a reliability layer that checks whether a correct answer reflects real understanding or a lucky guess, and produces a plain-language diagnostic report for the teacher after each session.

Built for the Petrosains AI Educator Challenge 2026.

## AI calls run through a server-side proxy

Every AI feature in this app, coaching dialogue, the diagnostic report, the level maker, the comprehension question, calls a single function, `callClaude()` in `src/App.jsx`, which posts to `/api/claude`. That endpoint is a Vercel serverless function (`api/claude.js`) that holds the real Anthropic API key server-side and forwards the request to `https://api.anthropic.com/v1/messages`. The key is never sent to the browser.

The proxy also applies some basic protections before forwarding a request:

- **Method restriction**: only `POST` is accepted.
- **Origin allowlist**: if `ALLOWED_ORIGINS` is set, requests must come from one of those origins; otherwise the request is rejected. Leave it unset during initial setup, set it before sharing the deployed link publicly.
- **Payload validation**: model name, prompt/message lengths, and message count are checked against fixed limits before the request is forwarded.
- **`max_tokens` cap**: forwarded requests are capped regardless of what the client sends.
- **Best-effort rate limiting**: a per-instance in-memory limiter (20 requests/minute/IP). Since serverless instances are short-lived and not shared, this isn't a global guarantee, it deters casual abuse of a warm instance, not a determined attacker.

If you deploy this outside Vercel, reimplement `api/claude.js`'s logic as whatever server-side endpoint your host supports; the frontend only needs `/api/claude` to exist and behave the same way.

## Tech stack

- React 18 + Vite
- Tailwind CSS
- lucide-react (icons)
- Browser's native `SpeechSynthesis` API for text-to-speech (no external dependency)
- Vercel serverless function for the Anthropic API proxy (`api/claude.js`)
- No database, no login — sessions are entirely in-memory and reset on reload by design (see [Architecture notes](#architecture-notes) below)

## Getting started

1. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` (and `ALLOWED_ORIGINS` once you have a deployed URL).
2. Install dependencies and run with the Vercel CLI so the `/api` function is served alongside the frontend:

```bash
npm install
npm i -g vercel   # if you don't already have it
vercel dev
```

Running `vite` directly (`npm run dev`) serves the frontend only; `/api/claude` won't resolve without `vercel dev` or an equivalent proxy setup.

## Deploying to Vercel

1. Import the repo into a new Vercel project (framework preset: Vite).
2. In the project's Environment Variables, set `ANTHROPIC_API_KEY` (your real key) and `ALLOWED_ORIGINS` (your deployed domain, e.g. `https://your-app.vercel.app`).
3. Deploy. Vercel builds the frontend (`npm run build` → `dist/`) and picks up `api/claude.js` as a serverless function automatically.

## Project structure

```
├── api/
│   └── claude.js     # Serverless proxy to the Anthropic API (holds the real key)
├── index.html
├── src/
│   ├── main.jsx      # React entry point
│   ├── App.jsx        # The entire application (single file, see note below)
│   └── index.css      # Tailwind entry point
├── tailwind.config.js
├── vite.config.js
└── package.json
```

`src/App.jsx` is intentionally a single large file. It was built iteratively as a Claude Artifact, where the whole app lives in one component tree without a build step. It has not yet been split into smaller modules, that would be a reasonable next step for long-term maintainability but wasn't a priority while iterating quickly on features.

## Architecture notes

- **No login, no persistence across sessions, by design.** G.I.S.T. is meant for one-time, teacher-supervised use per session on a shared classroom device. A student plays through a map once; the "save" step is the teacher downloading the diagnostic report (an HTML file, openable in any browser, printable to PDF) before handing the device to the next student.
- **Bilingual support (EN/BM) is scoped to the onboarding tutorial only**, not gameplay. This was a deliberate decision, gameplay stays fully English-immersion; the tutorial is the one place a struggling reader gets Bahasa Malaysia support before the actual assessment begins.
- **The diagnostic report is intentionally jargon-free.** Internal data labels (clue type, transfer test, prior knowledge) are never surfaced to the teacher as-is, every finding is translated into plain language explaining what it actually means for the student.

## Status

Functionally complete and iteratively tested within the Claude Artifacts environment across many rounds of real-device testing. **Not yet validated in a real classroom with a real student** as of this writing, that's the next and most important step before treating this as finished.
