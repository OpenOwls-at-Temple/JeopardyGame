# Conventions

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Defines how code is written on this project. These rules apply to every file, every session.

---

## Language & Framework Versions

| Technology | Version |
|------------|---------|
| Node.js | 18+ (Vite 5 requirement) |
| React | 18 |
| TypeScript | Strict mode (`tsc -b`, no unused locals/params) |

---

## Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| React components | `PascalCase`, one component per file, file name matches component | `AIGenerateModal.tsx` |
| Hooks | `camelCase` prefixed with `use` | `useApp` |
| Lib modules | `camelCase.ts`, one responsibility per file | `aiGenerate.ts`, `slideParser.ts` |
| CSS classes | `kebab-case` | `score-card`, `streaming-pulse` |
| `localStorage` keys | `owl_jeopardy.<entity>` | `owl_jeopardy.banks`, `owl_jeopardy.ai_cache` |
| Git branches | `type/short-description` (this repo's history also used bare branch names like `branch2` for the assignment milestone) | `feat/difficulty-calibration` |

---

## File & Folder Conventions

- One component per file in `src/components/` and `src/pages/`
- Domain types live only in `src/types.ts` — no module-local duplicate type definitions
- All `localStorage` reads/writes go through `src/lib/storage.ts` — no component or context code
  calls `localStorage` directly except the two narrowly-scoped exceptions that already exist
  (`aiCache.ts` for the AI result cache, and the API-key save checkbox in `AIGenerateModal.tsx`)
- All AI prompt construction lives in `src/lib/aiGenerate.ts` — never inline in component code

---

## Code Style

- Functional React components with hooks; no class components
- Plain CSS in `src/styles/global.css` using CSS custom properties (design tokens) at `:root` —
  reuse existing `.btn`, `.card`, `.field`, `.modal` classes rather than introducing a CSS framework
- No commented-out code in commits — delete it or leave a `TODO:` with a reason
- No `console.log` left in committed code

---

## Git Conventions

- Commit messages follow `type: short description` (`feat`, `fix`, `docs`, `refactor`, `chore`) —
  see `git log` on this repo for examples already following this pattern
- This repo's actual workflow on `branch2` has been single-branch, sequential commits rather than
  one-feature-per-branch-plus-PR — if the team adopts a stricter branch-per-feature + PR-review
  workflow going forward (matching `owl-jeopardy-pilot`), record that decision in `progress.md`
  rather than assuming it retroactively

---

## Testing Conventions

- There is currently **no test suite** (no Jest/Vitest, no test files) — `npm run build` (TypeScript
  strict mode + Vite build) is the only correctness gate
- If tests are introduced, mirror the reference repo's convention: test files named
  `[module].test.ts`, colocated or under a `tests/` folder, run in CI before merge

---

## LLM / AI Conventions

- All prompts are defined in `src/lib/aiGenerate.ts` — never hardcoded inline in
  `AIGenerateModal.tsx` or any other component
- All LLM calls (`generateQuestions`, `generateQuestionsStream`) must have explicit error handling
  surfaced to the user in the modal, not swallowed silently
- The Anthropic API key is never committed, never logged, and only ever lives in a form field or
  optionally `localStorage` — never a build-time env var (there is no backend to hold a server-side
  secret yet; see `llm-integration.md`'s Migration Plan)
- Do not send PII to the LLM (currently moot — this app collects none, but keep it true if accounts
  are ever added)

---

## What Claude Code Should Never Do

- Never modify files in `ai_specs/` without explicit instruction
- Never introduce a backend, database, or auth flow "to fix" the client-side API key issue without
  being asked — that's a scope decision for the team and faculty sponsor, not a unilateral refactor
  (see the flagged gap in `llm-integration.md`)
- Never break the "games snapshot their bank at creation time" invariant — see `domain-knowledge.md`
- Never use a library not already in `package.json` without asking first
