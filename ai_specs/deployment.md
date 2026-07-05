# Deployment

> **OpenOwls SDD** — Read by engineers and DevOps-minded team members.
> Defines how the application is built, configured, and deployed across environments.
>
> **Current status: no deployment exists yet.** The app runs locally only. This file documents
> local setup now, and the planned production stack (Render + Supabase, per Professor Pang's
> 2026-06-28 guidance) once Feature 6 is built.

---

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Local | Development and testing | `http://localhost:5173` (Vite dev server) |
| Production | Hosted (planned — not yet set up) | Render (frontend static site + FastAPI web service) + Supabase |

---

## Planned Hosting Stack (once Feature 6 is built)

Per Professor Pang's 2026-06-28 guidance:

| Layer | Platform | Notes |
|-------|----------|-------|
| Frontend | Render Static Site (or Vercel) | `npm run build` → `dist/` — pure static bundle, hash router |
| Backend | Render Web Service | FastAPI (Python), always-on, one dyno is fine for a class-size user base |
| Database | Supabase managed Postgres | `llm_usage` quota table; user-level file storage (Feature 7) |
| File storage | Supabase Storage | Slide uploads (`.pptx`/`.pdf`), session-scoped, 7-day auto-purge |

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+ (for the FastAPI backend — **only needed once Feature 6 is built**)
- For the AI generation feature (current branch2 — client-side calls): an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- For local testing with the planned backend: a **DeepSeek API key** (free tier) from [platform.deepseek.com](https://platform.deepseek.com), *or* a local Ollama instance with a model pulled

### Frontend (works today)

```bash
git clone https://github.com/OpenOwls-at-Temple/<this-repo>.git
cd JeopardyGame-phase1
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # tsc -b (strict type-check) then vite build -> dist/
npm run preview  # serve the production build locally
```

There is no separate lint/test step — `npm run build` is the project's correctness gate.

### Backend (once Feature 6 is built — not yet)

```bash
cd backend/
pip install -r requirements.txt
cp .env.example .env   # fill in LLM_* and SUPABASE_* values
uvicorn main:app --reload --port 8000
```

Then in the frontend, set `VITE_API_BASE_URL=http://localhost:8000` (or proxy via Vite config).

---

## Environment Variables

### Frontend

No environment variables are committed. The Vite build has no secrets. If a `VITE_API_BASE_URL`
is added to point the frontend at the local or production backend, it goes in `.env.local`
(gitignored) — never committed.

### Backend (planned — FastAPI, server-side only)

All secrets live in the backend's `.env` file, which is **never committed to the repo**.

| Variable | Description | Local default |
|----------|-------------|---------------|
| `LLM_BASE_URL` | OpenAI-compatible API base URL | `https://api.deepseek.com` |
| `LLM_MODEL` | Model name used for generation | `deepseek-chat` |
| `LLM_API_KEY` | API key for the LLM provider | (your DeepSeek key; blank for local Ollama) |
| `LLM_DAILY_TOKEN_CAP` | Hard daily token limit (input+output) | `100000` |
| `SUPABASE_URL` | Supabase project URL | — |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) | — |

**Switching LLM providers:** change `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_API_KEY` only — zero
code changes required. The Python `openai` SDK picks up the new values automatically.

```bash
# Local Ollama (free, no key)
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3
LLM_API_KEY=ollama

# DeepSeek API (free tier, good for testing)
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_API_KEY=sk-...

# OpenAI (production option)
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...
```

---

## Deployment Process (planned)

Not yet configured. When the team is ready:

1. Push `main` to GitHub
2. Render auto-deploys:
   - Static Site: `npm run build`, serves `dist/`
   - Web Service: `uvicorn main:app`, reads env vars from Render's environment settings (never from the repo)
3. Supabase: run the `llm_usage` migration manually once on the Supabase SQL editor (or add a migration file to `backend/migrations/`)
4. Set all `LLM_*` and `SUPABASE_*` env vars in Render's web service settings

---

## CI/CD Pipeline

None configured. `npm run build` (frontend) and the Python type-checker (when added) are run
manually before pushing.

---

## Secrets Management

- No secrets are committed to the repository
- Backend `.env` is gitignored — the only place secrets live at rest locally
- In production: Render injects env vars at runtime; Supabase service key is never in code
- The `LLM_API_KEY` never appears in any API response body, browser request, or log line

---

## Common Issues

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| `tsc` not found on first build | `node_modules` not installed | Run `npm install` |
| Blank page opening `dist/index.html` directly | Some browsers block `file://` module loading | Use `npm run preview` instead |
| AI generation fails with 401 (current client-side mode) | Invalid or expired Anthropic API key | Re-enter the key in the modal |
| AI generation fails with 429 (once Feature 6 is live) | Daily token quota hit | Wait until tomorrow, or raise `LLM_DAILY_TOKEN_CAP` in the backend env |
