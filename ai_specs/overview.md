# Overview

> **OpenOwls SDD** — Read by the business sponsor and the full team.
> Describes the project at a high level: what it is, why it exists, who it is for, and what technology it uses.

---

## Project Name

**Owl Jeopardy** (this repo: `JeopardyGame-phase1` / branch `branch2`)

## One-Line Description

A frontend-only, browser-based Jeopardy-style review game that lets a teacher build a question bank by hand or generate one with Claude, then run a live scored game on a projector — no backend, no accounts, no database.

---

## Relationship to `owl-jeopardy-pilot`

This repo is **not** the same product as the team's other reference repo,
[`owl-jeopardy-pilot`](https://github.com/OpenOwls-at-Temple/owl-jeopardy-pilot), which is Alex's
fuller vision of Owl Jeopardy (FastAPI backend, Postgres, Microsoft SSO, admin-managed users,
sharing/cloning between faculty, CSV import, a `subject_area → category → question(difficulty 1–5)`
data model, and LLM generation scoped to Phase 2 with server-side calls, quotas, and a draft/sign-off
review step).

This repo is a **smaller, frontend-only prototype**: single browser, `localStorage` only, no auth, no
sharing, no admin, and — notably — it shipped AI question generation directly in Phase 1, calling
Claude straight from the browser with a teacher-supplied API key. That is a real and current
divergence from the reference architecture, not an oversight; it is flagged explicitly in
[`features.md`](features.md) and [`llm-integration.md`](llm-integration.md) so the team and faculty
sponsor can decide whether to converge toward the reference design or keep this as an intentionally
lighter track.

---

## Problem Statement

Teachers commonly use Jeopardy-style games for in-class review, but ad hoc tools make every board a
one-off: questions are hard-coded into a single game, there's no reusable bank, and writing a full
board of clues by hand is slow. This prototype solves the second half of that problem — content
creation — by letting a teacher either type questions manually or describe a topic and have Claude
draft a full board (optionally grounded in uploaded lecture slides), then run the resulting game with
a classic categories/points board and host-awarded team scoring.

---

## Goals

- A teacher can build a question bank by hand, with categories and point values, in a few minutes
- A teacher can generate a full board of questions from a topic (or an uploaded `.pptx`/`.pdf`) using
  Claude, review/select the results, and add them to a bank — with zero changes to existing banks if
  they decline
- A teacher can run a live review game on a shared screen: click a tile, reveal the answer, award
  points to a team, see a live scoreboard
- Game state (scores, used tiles) persists in `localStorage` so a session survives a page reload

## Non-Goals (current scope — see `features.md` for what's deferred vs. skipped)

- No authentication, accounts, or admin user management
- No sharing or cloning of banks/games between users
- No CSV/JSON bulk import or export
- No `subject_area → category` hierarchy or a numeric difficulty scale (this prototype uses a
  3-level `easy/medium/hard` toggle on the *generator*, not a stored per-question difficulty)
- No server-side LLM proxy, no usage quotas, no draft/sign-off review queue (generated questions go
  straight into the bank once the teacher selects them in the review table)
- No Canvas LMS integration
- No real-time multiplayer or student-facing devices — the host runs the game on one shared screen

---

## Target Users

| User Type | Description |
|-----------|-------------|
| Primary User | A single teacher running the app locally in their own browser to prep and host a review game |
| Internal User | The two-person student team (Wei: LLM pipeline; Zirong: app/game engine) building and extending it |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18 + TypeScript + Vite | Hash routing (`/#/...`) so the production build works opened directly from disk |
| Persistence | `localStorage` only | No backend, no database — see `architecture-planning.md` |
| AI / LLM | Anthropic Claude (`claude-haiku-4-5-20251001`), called **directly from the browser** | Teacher supplies their own API key; see `llm-integration.md` for the security trade-off this implies |
| Slide parsing | `jszip` (PPTX) + `pdfjs-dist` (PDF), both client-side, lazy-loaded chunks | |
| Hosting | None — run via `npm run dev` / `npm run build` + open `dist/` locally | No deployment target exists yet; see `deployment.md` |

---

## Stakeholders

| Name / Role | Responsibility |
|-------------|----------------|
| Faculty Sponsor (Alex Pang) | Defines scope, reviews milestones, owns the OpenOwls SDD convention and the `owl-jeopardy-pilot` reference architecture |
| Wei | Owns the LLM integration (`aiGenerate.ts`, `aiCache.ts`, `slideParser.ts`, `AIGenerateModal.tsx`) |
| Zirong | App shell, game engine, board/scoring logic, docs |

---

## Key Constraints

- This is a class project prototype, not a production deployment — no budget, no hosting account, no
  real user base yet
- No PII is collected; the only externally-sent data is the topic/category text (and, when slides are
  uploaded, the extracted slide text) sent to the Anthropic API
- "Jeopardy" is a trademark of Sony; this is a free educational tool with no official branding or
  assets
