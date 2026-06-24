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
- [x] 2026-06-24 — Reviewed faculty feedback (Alex) on doc convention; cloned `hoot` and
  `owl-jeopardy-pilot` reference repos to extract the actual OpenOwls SDD template
- [x] 2026-06-24 — Migrated root `architecture.md` / `llm-integration.md` / `planning.md` into
  `ai_specs/` (`overview.md`, `features.md`, `architecture-planning.md`, `llm-integration.md`,
  `domain-knowledge.md`, `conventions.md`, `deployment.md`), rewritten to honestly reflect what's
  built (including the divergence from `owl-jeopardy-pilot`) rather than ported as-is

---

## In Progress

- [ ] Nothing actively in progress — `branch2` is feature-complete and tested; next step is a team
  decision (see Up Next)

---

## Blocked

| Item | Reason | Owner |
|------|--------|-------|
| Convergence decision (auth/backend/sharing/difficulty model) | Needs discussion with Wei and Alex before any code changes — this is a scope call, not something to decide unilaterally | Student team + Alex |

---

## Up Next

- [ ] Discuss with Wei + Alex: stay a frontend-only prototype track, or start converging toward
  `owl-jeopardy-pilot`'s architecture (backend proxy for the API key is the highest-priority gap —
  see `ai_specs/llm-integration.md` Migration Plan)
- [ ] If converging: stand up a minimal backend so the Anthropic key moves server-side (smallest
  fix for the biggest flagged risk)
- [ ] Decide whether `progress.md`'s Session Log going forward should track `branch2` only or be
  reconciled with `main`'s history once/if the branches merge

---

## Session Log

| Date | What Was Done |
|------|---------------|
| 2026-06-24 | Restructured docs per Alex's feedback to match the OpenOwls SDD `ai_specs/` convention used in `hoot` and `owl-jeopardy-pilot`. Cloned both reference repos to extract the real template. In doing so, surfaced and documented a substantive scope/architecture gap (no auth/admin/sharing/CSV-import/difficulty-model here; client-side LLM calls with no quotas or draft-review vs. the reference's server-side+BYOK+quota+sign-off design) rather than silently glossing over it — flagged in `overview.md`, `features.md`, and `llm-integration.md` for discussion with Wei and Alex. |
| 2026-06-24 | Final end-to-end regression test of `branch2` in a live browser preview before reporting status to faculty: bank editor, AI generate modal (validation, difficulty toggle, cancel flow), Add Question modal, full game flow (setup → board → tile → reveal → score → Done → disabled tile → progress counter), `localStorage` persistence verified directly. `npm run build` (tsc strict + vite) clean. Confirmed all 5 `branch2` commits already pushed to `origin/branch2`. |
| 2026-06-22 | Code review pass across the AI pipeline: fixed null `response.body` guard, NDJSON `]`-skip bug, cache quota-exceeded crash, corrupted-cache-JSON crash, malformed (empty question/answer) questions being addable, removed dead `currentCacheKey` state, added missing `--primary` CSS variable. |
| 2026-06-22 | Built three AI pipeline features in sequence on `branch2`: difficulty calibration, SSE+NDJSON streaming, slide ingestion (`.pptx`/`.pdf`), `localStorage` LRU caching. Wrote initial `architecture.md` and `llm-integration.md` (now migrated into `ai_specs/`). |
| 2026-06-15 | Created `branch2` from the Phase 1 baseline; added the initial AI question generation feature (Claude API call + "Generate with AI" button) per the assignment brief. |
