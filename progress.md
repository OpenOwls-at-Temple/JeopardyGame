# Progress

> **OpenOwls SDD** — Living status document. Update this file at the end of every work session.
> Claude Code reads this first at the start of every new session to catch up on project state.

## Current Phase

**Active Phase:** `branch2` AI generation work — code-complete and tested locally. Docs just
migrated to the OpenOwls SDD `ai_specs/` convention per faculty feedback (2026-06-22).

## Status Summary

`branch2` adds AI-assisted question generation (topic-based + slide-grounded, streaming, cached) on
top of the Phase 1 manual game from `main`. All features are built, code-reviewed, and manually
tested end-to-end in a live preview (bank editor, AI modal, game creation, play board, scoring,
persistence) — see Session Log. `npm run build` is clean. Docs were reorganized into `ai_specs/`
on 2026-06-24 after faculty review identified both a doc-convention mismatch and a real scope/
architecture gap against the team's other reference repo, `owl-jeopardy-pilot` (no auth, no backend,
client-side LLM calls here vs. server-side+quotas+draft-review there). That gap is now documented
explicitly in `ai_specs/overview.md`, `ai_specs/features.md`, and `ai_specs/llm-integration.md`
rather than left implicit — **decision pending** on whether/how far to converge toward the
reference architecture.

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

- [ ] **Feature 6 — Server-Side LLM Proxy** is fully spec'd (`features.md`, `llm-integration.md`
  Migration Plan, `architecture-planning.md`, `deployment.md` env vars) but **not yet implemented**.
  Ready for team review before coding starts, per Professor Pang's "update the spec, then generate the code"
  guidance.

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| Whether to implement Feature 6 now or wait for the team meeting | Spec is ready; Professor Pang offered a separate meeting with Zirong to align priorities — implementation should probably wait for that confirmation | Wei + Zirong + Professor Pang |

---

## Up Next

- [ ] Team meeting with Zirong + Professor Pang to confirm Feature 6's design (hosting choice: Vercel/Netlify
  function vs. a small Express service on Render) before writing any backend code
- [ ] Once confirmed: implement Feature 6 — add the backend, update `aiGenerate.ts`'s two `fetch`
  calls, remove the API-key field from `AIGenerateModal.tsx` (see `llm-integration.md` Migration
  Plan for the exact diff scope)
- [ ] After Feature 6 ships: repeat the cycle for the next-highest-value gap (per Professor Pang's guidance,
  one feature at a time — auth is the natural next one, since sharing/admin/BYOK/quotas all depend
  on it)
- [ ] Decide whether `progress.md`'s Session Log going forward should track `branch2` only or be
  reconciled with `main`'s history once/if the branches merge

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-06-24 | Professor Pang's feedback on the convergence question: don't decide the whole scope question up front — pick gaps vs. `owl-jeopardy-pilot` one at a time, spec each before coding it ("Take a look on what have been built, think about the new features, update the specs, then generate the code"). Picked Feature 6 (server-side LLM proxy) as the first one — it's the only "Out of Scope" item that's an actual security risk rather than a missing convenience. Fully spec'd it: `features.md` (acceptance criteria), `llm-integration.md` (concrete endpoint contract, env vars, soft-quota design, exact frontend diff scope), `architecture-planning.md`, `deployment.md` (env vars). No backend code written yet — spec is ready for the team meeting Professor Pang offered. |
| 2026-06-24 | Updated `ai_specs/overview.md`'s stakeholder table to use the teammate's actual name (Zirong) instead of a generic placeholder. |
| 2026-06-24 | Restructured docs per Professor Pang's feedback to match the OpenOwls SDD `ai_specs/` convention used in `hoot` and `owl-jeopardy-pilot`. Cloned both reference repos to extract the real template. In doing so, surfaced and documented a substantive scope/architecture gap (no auth/admin/sharing/CSV-import/difficulty-model here; client-side LLM calls with no quotas or draft-review vs. the reference's server-side+BYOK+quota+sign-off design) rather than silently glossing over it — flagged in `overview.md`, `features.md`, and `llm-integration.md` for discussion with Wei and Professor Pang. |
| 2026-06-24 | Final end-to-end regression test of `branch2` in a live browser preview before reporting status to faculty: bank editor, AI generate modal (validation, difficulty toggle, cancel flow), Add Question modal, full game flow (setup → board → tile → reveal → score → Done → disabled tile → progress counter), `localStorage` persistence verified directly. `npm run build` (tsc strict + vite) clean. Confirmed all 5 `branch2` commits already pushed to `origin/branch2`. |
| 2026-06-22 | Code review pass across the AI pipeline: fixed null `response.body` guard, NDJSON `]`-skip bug, cache quota-exceeded crash, corrupted-cache-JSON crash, malformed (empty question/answer) questions being addable, removed dead `currentCacheKey` state, added missing `--primary` CSS variable. |
| 2026-06-22 | Built three AI pipeline features in sequence on `branch2`: difficulty calibration, SSE+NDJSON streaming, slide ingestion (`.pptx`/`.pdf`), `localStorage` LRU caching. Wrote initial `architecture.md` and `llm-integration.md` (now migrated into `ai_specs/`). |
| 2026-06-15 | Created `branch2` from the Phase 1 baseline; added the initial AI question generation feature (Claude API call + "Generate with AI" button) per the assignment brief. |
