# Progress

> **OpenOwls SDD** — Living status document. Update this file at the end of every work session.
> Claude Code reads this first at the start of every new session to catch up on project state.

## Current Phase

**Active Phase:** `branch2` AI generation work — code-complete and tested locally. Docs just
migrated to the OpenOwls SDD `ai_specs/` convention per faculty feedback (2026-06-22).

## Status Summary

`branch2` has been merged into `main` (2026-07-05) per Professor Pang's request. All Phase 1
(manual game) and Phase 2 (AI generation) features are built, tested, and on `main`. `npm run build`
is clean. Docs follow the OpenOwls SDD `ai_specs/` convention. Feature 6 (FastAPI backend,
OpenAI-compatible LLM layer, Supabase Postgres, hard quota, DeepSeek for local testing) and
Feature 7 (user-level file storage via Supabase Storage) are fully spec'd and ready to implement
after the team catch-up meeting (Mon/Tue 2026-07-07 or 2026-07-08). Professor Pang plans to chip
in to the project this week (Discord 2026-07-04).

---

## Completed

- [x] 2026-06-15 — Phase 1 baseline: manual question banks, game creation/play, scoreboard,
  `localStorage` persistence (`main`)
- [x] 2026-06-15 — Initial AI question generation via Claude API, client-side call + button (`branch2`)
- [x] 2026-06-22 — Difficulty calibration (`easy`/`medium`/`hard` prompt tiers)
- [x] 2026-06-22 — Streaming generation (SSE + NDJSON, row-by-row review table)
- [x] 2026-06-22 — Slide ingestion: `.pptx` (jszip + namespace-safe XML parsing) and `.pdf` (pdfjs-dist)
- [x] 2026-06-22 — LRU result caching in `localStorage`
- [x] 2026-06-22 — Code review pass + bug fixes across the AI pipeline (null-body guard, NDJSON `]`
  skip, cache quota/corruption guards, malformed-question filter, dead-state cleanup, missing
  `--primary` CSS var)
- [x] 2026-06-24 — Full manual regression pass in a live browser preview: bank editor, AI modal (all
  fields, difficulty toggle, validation, cancel), game setup, play board (tile → reveal → score →
  disable → progress counter), `localStorage` persistence — all confirmed working; `npm run build` clean
- [x] 2026-06-24 — Reviewed faculty feedback (Professor Pang) on doc convention; cloned `hoot` and
  `owl-jeopardy-pilot` reference repos to extract the actual OpenOwls SDD template
- [x] 2026-06-24 — Migrated root `architecture.md` / `llm-integration.md` / `planning.md` into
  `ai_specs/` (`overview.md`, `features.md`, `architecture-planning.md`, `llm-integration.md`,
  `domain-knowledge.md`, `conventions.md`, `deployment.md`), rewritten to honestly reflect what's
  built (including the divergence from `owl-jeopardy-pilot`) rather than ported as-is

---

## In Progress

- [x] **Feature 6 — Server-Side LLM Proxy** — implemented locally (2026-07-08).
  `backend/` FastAPI app with LiteLLM (confirmed by Professor Pang 2026-07-05). Frontend API key
  field removed; all generation goes through `POST /api/generate`; model switchable via `.env`.
  Hard daily token quota wired in. **Still needs:** Supabase project + migration run, deploy to Render.
- [ ] **Feature 7 — User-Level File Storage** spec'd (2026-07-05). Depends on Feature 6 backend.
  Not yet implemented.

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| Implementing Feature 6 & 7 | Specs ready; team catch-up (Mon/Tue 2026-07-07 or 2026-07-08) needed to confirm Render+Supabase setup steps and who owns the backend work | Wei + Zirong + Professor Pang |

---

## Up Next

- [ ] Team catch-up Mon 2026-07-07 or Tue 2026-07-08 — confirm Feature 6 implementation plan
  (who sets up Render + Supabase, who owns the FastAPI backend, branch strategy)
- [ ] Implement Feature 6: `backend/` FastAPI service, update `aiGenerate.ts` (URL + simpler SSE
  parser), remove API-key field from `AIGenerateModal.tsx` — see `llm-integration.md` Migration Plan
- [ ] Implement Feature 7: `POST /api/upload-slide`, Supabase Storage, server-side slide parsing
- [ ] After Feature 6+7: auth/SSO (Microsoft Entra or otherwise) is the natural next feature
  since sharing, admin, per-user quotas, and BYOK all depend on user identity

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-07-08 | Implemented Feature 6: `backend/` FastAPI app with LiteLLM abstraction layer (per Professor Pang's 2026-07-05 confirmation). Model switchable via `LLM_MODEL` env var (DeepSeek, Claude, OpenAI, Ollama — zero code change). Hard daily token quota (`LLM_DAILY_TOKEN_CAP`). Frontend: removed API key field + save-key checkbox from `AIGenerateModal.tsx`; `aiGenerate.ts` now calls `/api/generate` with simplified SSE parser. Vite proxy added for local dev. `npm run build` clean. Supabase `llm_usage` migration SQL in `backend/migrations/`. Still needs: Supabase project created + migration run, deploy to Render. |
| 2026-07-05 | Updated specs to incorporate Professor Pang's 2026-06-28 architectural guidance: Feature 6 spec rewritten (FastAPI on Render, Supabase Postgres, OpenAI-compatible LLM abstraction with DeepSeek for local/free testing, hard daily token quota, model switchable via `.env`); Feature 7 spec'd for the first time (user-level file storage via Supabase Storage); `architecture-planning.md` updated with planned full-stack diagram; `deployment.md` fully rewritten with Render+Supabase target and local DeepSeek setup. Merged `branch2` → `main` per Professor Pang's request. |
| 2026-06-24 | Professor Pang's feedback on the convergence question: don't decide the whole scope question up front — pick gaps vs. `owl-jeopardy-pilot` one at a time, spec each before coding it ("Take a look on what have been built, think about the new features, update the specs, then generate the code"). Picked Feature 6 (server-side LLM proxy) as the first one — it's the only "Out of Scope" item that's an actual security risk rather than a missing convenience. Fully spec'd it: `features.md` (acceptance criteria), `llm-integration.md` (concrete endpoint contract, env vars, soft-quota design, exact frontend diff scope), `architecture-planning.md`, `deployment.md` (env vars). No backend code written yet — spec is ready for the team meeting Professor Pang offered. |
| 2026-06-24 | Updated `ai_specs/overview.md`'s stakeholder table to use the teammate's actual name (Zirong) instead of a generic placeholder. |
| 2026-06-24 | Restructured docs per Professor Pang's feedback to match the OpenOwls SDD `ai_specs/` convention used in `hoot` and `owl-jeopardy-pilot`. Cloned both reference repos to extract the real template. In doing so, surfaced and documented a substantive scope/architecture gap (no auth/admin/sharing/CSV-import/difficulty-model here; client-side LLM calls with no quotas or draft-review vs. the reference's server-side+BYOK+quota+sign-off design) rather than silently glossing over it — flagged in `overview.md`, `features.md`, and `llm-integration.md` for discussion with Wei and Professor Pang. |
| 2026-06-24 | Final end-to-end regression test of `branch2` in a live browser preview before reporting status to faculty: bank editor, AI generate modal (validation, difficulty toggle, cancel flow), Add Question modal, full game flow (setup → board → tile → reveal → score → Done → disabled tile → progress counter), `localStorage` persistence verified directly. `npm run build` (tsc strict + vite) clean. Confirmed all 5 `branch2` commits already pushed to `origin/branch2`. |
| 2026-06-22 | Code review pass across the AI pipeline: fixed null `response.body` guard, NDJSON `]`-skip bug, cache quota-exceeded crash, corrupted-cache-JSON crash, malformed (empty question/answer) questions being addable, removed dead `currentCacheKey` state, added missing `--primary` CSS variable. |
| 2026-06-22 | Built three AI pipeline features in sequence on `branch2`: difficulty calibration, SSE+NDJSON streaming, slide ingestion (`.pptx`/`.pdf`), `localStorage` LRU caching. Wrote initial `architecture.md` and `llm-integration.md` (now migrated into `ai_specs/`). |
| 2026-06-15 | Created `branch2` from the Phase 1 baseline; added the initial AI question generation feature (Claude API call + "Generate with AI" button) per the assignment brief. |
