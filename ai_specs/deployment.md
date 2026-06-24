# Deployment

> **OpenOwls SDD** — Read by engineers and DevOps-minded team members.
> Defines how the application is built, configured, and deployed across environments.
>
> **Current status: there is no deployment.** This app has only ever been run locally. This file
> documents local setup now, and leaves the hosting sections as open questions for when/if the team
> decides to deploy it (see `Up Next` in `progress.md`).

---

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Local | Development and testing on your own machine | `http://localhost:5173` (dev), or open `dist/index.html` directly after `npm run build` |
| Staging | Not set up | — |
| Production | Not set up | — |

---

## Hosting Platforms

None yet. This is a fully static frontend bundle (no backend, no database), so when the team is
ready it can ship to any static host (e.g. Render Static Site, Vercel, GitHub Pages, Netlify) with
zero backend configuration — the hash router (`/#/...`) was chosen specifically so it works even
without server-side route rewrites.

---

## Environment Variables

None required. There is no `.env` file in this repo. The Anthropic API key is entered by the teacher
at runtime in the AI Generate modal and optionally saved to `localStorage` — it is never a build-time
variable and must never be committed.

If the Migration Plan in `ai_specs/llm-integration.md` is implemented (server-side proxy), that
backend would need:

| Variable | Description |
|----------|--------------|
| `ANTHROPIC_API_KEY` | System-wide key, held server-side only, never sent to the client |

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com) (only needed to
  use the AI generation feature — the rest of the app works with zero external accounts)

### Steps

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

---

## Deployment Process

Not yet defined. When the team picks a static host, this section should document:
1. How the build is triggered (push to a branch? manual?)
2. Where the API key warning/instructions are shown to end users (since there's no server-side key)
3. Whether `branch2` or `main` is the deploy source

---

## CI/CD Pipeline

None configured. `npm run build` is run manually before pushing.

---

## Common Deployment Issues

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| `tsc` not found on first build | `node_modules` not installed | Run `npm install` before `npm run build` |
| Blank page when opening `dist/index.html` directly | Browser blocking `file://` module loading in some configurations | Use `npm run preview` or a static file server instead of double-clicking `index.html` in stricter browsers |
| AI generation fails with 401 | Invalid or missing Anthropic API key | Re-enter the key in the modal; verify it at console.anthropic.com |

---

## Secrets Management

- No secrets are stored in this repository
- The Anthropic API key lives only in browser memory or `localStorage`, entered by the end user —
  there is currently no server-side secret to manage at all
