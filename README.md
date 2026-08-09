# G.I.S.T. — Guided Inference Skill Trainer

An AI-powered vocabulary and reading comprehension assessment tool built for Malaysian primary school ESL students (Year 4–6).

G.I.S.T. asks students to work out unfamiliar words directly from context, guided by one of eight animal coach personas, never handed the answer outright. It includes a reliability layer that checks whether a correct answer reflects real understanding or a lucky guess, and produces a plain-language diagnostic report for the teacher after each session.

Built for the Petrosains AI Educator Challenge 2026.

## For teachers: what this actually is

You don't need to read the rest of this file to understand the project — it's here for anyone deploying or maintaining it.

G.I.S.T. is a short, guided activity a student plays on a tablet or laptop, with a teacher nearby. The student picks a reading passage; an AI "coach" (one of eight animal characters) walks them through 3–5 tricky vocabulary words, one at a time, always making them work the meaning out from context, never just telling them the answer. Afterward, you (the teacher) get a plain-language report: which words the student genuinely understood, which they only guessed at, and one concrete thing to try in your next lesson — no jargon, no dashboards to interpret.

**Wanting to try it with your own class?** You don't need to set any of this up yourself — ask whoever manages the deployed link for your class's access code, then just open the link on a device and go. If you're interested in running your *own* copy (a different school, your own Google account, full control over it), everything below is what a technical setup helper would need — it's more detail than a teacher needs day-to-day, but it's what makes it possible for someone else to stand up their own instance.

## AI calls run through a server-side proxy

Every AI feature in this app, coaching dialogue, the diagnostic report, the level maker, the comprehension question, calls a single function, `callClaude()` in `src/App.jsx`, which posts to `/api/claude`. That endpoint is a Vercel serverless function (`api/claude.js`) that holds a real API key server-side and forwards the request to the upstream model. The key is never sent to the browser.

The proxy currently calls **Google's Gemini API** (free tier, no credit card required), not Anthropic, chosen to avoid billing during early testing. It translates Gemini's request/response shape internally so `App.jsx` doesn't need to know or care which provider is behind `/api/claude`, that's still the one function every AI feature goes through, same as before. Swapping providers again later (e.g. to Anthropic once budget allows) only means rewriting `api/claude.js`, not the frontend.

The proxy also applies several protections before forwarding a request:

- **Method restriction**: only `POST` is accepted. On Vercel this is rejected at the edge, before the request even reaches the Node function (see `middleware.js` below).
- **Origin allowlist**: if `ALLOWED_ORIGINS` is set, requests must come from one of those origins; otherwise the request is rejected. Leave it unset during initial setup, set it before sharing the deployed link publicly. Also enforced at the edge on Vercel.
- **Access-code gate**: every request to `/api/claude` must carry a valid, short-lived `Authorization: Bearer <token>` header, obtained by first calling `/api/auth` with a code from `ACCESS_CODES`. See [Access codes](#access-codes-lightweight-multi-teacherschool-auth) below.
- **Per-code daily quota**: each access code is capped at `DAILY_QUOTA_PER_CODE` requests/day (default 300), tracked by the label embedded in its token, independent of IP.
- **Payload validation**: model name, prompt/message lengths, and message count are checked against fixed limits before the request is forwarded.
- **`max_tokens` cap**: forwarded requests are capped regardless of what the client sends.
- **Best-effort rate limiting**: a per-instance in-memory limiter (20 requests/minute/IP). Since serverless instances are short-lived and not shared, this isn't a global guarantee, it deters casual abuse of a warm instance, not a determined attacker. The real global backstop is the Vercel Firewall rule described below.

The proxy logic itself lives in `api/_claudeHandler.js`, shared between two entry points depending on how you deploy (see below): `api/claude.js` (a Vercel serverless function) and `server.js` (a plain Node/Express server for container-based hosts). The access-code logic follows the same split: `api/_authHandler.js` shared by `api/auth.js` (Vercel) and `server.js`.

## Access codes (lightweight multi-teacher/school auth)

G.I.S.T. doesn't have real user accounts, there's no database to hold them. Instead, access is gated by shared codes you distribute to teachers or schools:

1. Set `ACCESS_CODES` (see `.env.example`) to a comma-separated list, e.g. `ACCESS_CODES=apple123:SMK Jaya,banana456:SMK Bukit`. The part after `:` is just a label used for quota tracking; you can omit it (`ACCESS_CODES=apple123,banana456`) and the code itself is used as the label.
2. Set `AUTH_SECRET` to any long random string (e.g. `openssl rand -hex 32`). This signs the short-lived session tokens issued after a correct code; it must stay secret and should differ from `GEMINI_API_KEY`.
3. On first load, the app shows an access-code screen. A correct code exchanges for a signed token (`/api/auth`), cached in the browser's `sessionStorage` (cleared when the tab closes) for `TOKEN_TTL_MINUTES` (default 720 = 12h, a school day plus margin). Every `/api/claude` call after that carries the token; an expired or missing token gets a 401 and the app re-shows the code screen.
4. Rotate access by editing `ACCESS_CODES` and redeploying — there's nothing to revoke elsewhere, since codes aren't tied to accounts.

This protects your Gemini quota/cost from random internet traffic; it is **not** meant to protect sensitive data, since the app stores nothing server-side to begin with.

## Rotating keys and secrets

All three secret values (`GEMINI_API_KEY`, `AUTH_SECRET`, `ACCESS_CODES`) live only in Vercel's Environment Variables (or your host's equivalent) — rotating any of them is: generate/obtain a new value, update it there, redeploy. None of them are referenced anywhere else, so nothing else needs updating.

- **`GEMINI_API_KEY`**: rotate immediately (delete the old key in AI Studio, generate a new one) if it's ever pasted into a chat, screenshot, commit, or anywhere outside Vercel's UI. Do this periodically regardless, as routine hygiene.
- **`AUTH_SECRET`**: rotating it instantly invalidates every currently-issued access token, forcing everyone to re-enter their access code — harmless, since no session data is lost by design.
- **`ACCESS_CODES`**: see step 4 above — just edit the list.

## Vercel Firewall rate-limit rule (recommended, dashboard-only)

`middleware.js` and the in-memory limiter in `_claudeHandler.js` only go so far. For a real, globally-enforced cap, add a Vercel Firewall rule after your first deploy (free on the Hobby plan, 1 rule/project):

1. Open your project on vercel.com → **Firewall** → **Configure** → **+ New Rule**.
2. Condition: request path starts with `/api/`.
3. Action: **Rate Limit**, algorithm **Fixed Window**, e.g. 100 requests per 60s, keyed by **IP**.
4. Action on exceeding the limit: **Deny** (or **Challenge**, if you want a browser challenge instead of a hard block).
5. Save, review changes, **Publish**.

This blocks abusive IPs before your function runs at all, on top of the access-code gate above.

## Tech stack

- React 18 + Vite
- Tailwind CSS
- lucide-react (icons)
- Browser's native `SpeechSynthesis` API for text-to-speech (no external dependency)
- Vercel serverless function or Express server for the Gemini API proxy (`api/claude.js` / `server.js`)
- No database, no user accounts — access is gated by shared codes (see [Access codes](#access-codes-lightweight-multi-teacherschool-auth)), and session data is entirely in-memory and reset on reload by design (see [Architecture notes](#architecture-notes) below)

## Getting started

1. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (get one free at aistudio.google.com/apikey), `ACCESS_CODES`, and `AUTH_SECRET`. Set `ALLOWED_ORIGINS` once you have a deployed URL.
2. Install dependencies and run with the Vercel CLI so the `/api` functions and edge middleware are served alongside the frontend:

```bash
npm install
npm i -g vercel   # if you don't already have it
vercel dev
```

Running `vite` directly (`npm run dev`) serves the frontend only; `/api/claude` won't resolve without `vercel dev` or an equivalent proxy setup.

## Deploying to Vercel

1. Import the repo into a new Vercel project (framework preset: Vite).
2. In the project's Environment Variables, set `GEMINI_API_KEY` (your free key from aistudio.google.com/apikey), `ACCESS_CODES`, `AUTH_SECRET`, and `ALLOWED_ORIGINS` (your deployed domain, e.g. `https://your-app.vercel.app`). See [Access codes](#access-codes-lightweight-multi-teacherschool-auth) above.
3. Deploy. Vercel builds the frontend (`npm run build` → `dist/`), picks up `api/claude.js` and `api/auth.js` as serverless functions, and `middleware.js` as edge middleware, automatically.
4. After the first deploy, add the [Vercel Firewall rate-limit rule](#vercel-firewall-rate-limit-rule-recommended-dashboard-only) above.

## Deploying to a container host (e.g. Google AI Studio / Cloud Run)

Container-based hosts don't run per-file serverless functions the way Vercel does, they expect a single process that starts and listens on `process.env.PORT`. `server.js` is that process: it serves the built frontend and handles `/api/claude` itself via Express.

1. Set `GEMINI_API_KEY` and `ALLOWED_ORIGINS` as environment variables/secrets in the host's project settings (in Google AI Studio's case, this may already be wired up automatically from your Google account, since it issues the free key itself).
2. The host should run `npm install`, then `npm run build` (or the `gcp-build` script, which does the same thing, some GCP buildpacks run this automatically), then `npm start` (`node server.js`). If the host lets you set a build/start command explicitly, use those.
3. If a deploy fails with something like "container failed to start and listen on the port", it means the host isn't running `npm start`, double check the build/start command configuration rather than the app code.

## Project structure

```
├── api/
│   ├── claude.js            # Vercel serverless function entry point
│   ├── _claudeHandler.js    # The actual proxy logic (Gemini call + auth + protections), shared with server.js
│   ├── auth.js               # Vercel serverless function entry point for the access-code exchange
│   ├── _authHandler.js       # Access-code validation + token issuing, shared with server.js
│   └── _auth.js               # Shared HMAC token sign/verify helpers
├── middleware.js              # Vercel Edge Middleware: rejects bad method/origin before functions run
├── server.js                 # Node/Express server for container-based hosts (Cloud Run, etc.)
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

- **No user accounts, no persistence across sessions, by design.** G.I.S.T. is meant for one-time, teacher-supervised use per session on a shared classroom device. A student plays through a map once; the "save" step is the teacher downloading the diagnostic report (an HTML file, openable in any browser, printable to PDF) before handing the device to the next student. The access-code gate controls who can reach the AI proxy at all, it isn't a per-student login and doesn't persist any session data server-side.
- **Bilingual support (EN/BM) is scoped to the onboarding tutorial only**, not gameplay. This was a deliberate decision, gameplay stays fully English-immersion; the tutorial is the one place a struggling reader gets Bahasa Malaysia support before the actual assessment begins.
- **The diagnostic report is intentionally jargon-free.** Internal data labels (clue type, transfer test, prior knowledge) are never surfaced to the teacher as-is, every finding is translated into plain language explaining what it actually means for the student.

## Status

Functionally complete and iteratively tested within the Claude Artifacts environment across many rounds of real-device testing. **Not yet validated in a real classroom with a real student** as of this writing, that's the next and most important step before treating this as finished.
