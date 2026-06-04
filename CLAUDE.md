# CLAUDE.md

Guidance for [Claude Code](https://claude.com/claude-code) (and other AI agents)
working in this repository, plus a record of how the project was built with Claude.

## Project at a glance

🦉 **Owl Jeopardy** — an AI-powered Jeopardy-style review game for classroom
review sessions.

- **Stack:** React 18 + TypeScript + Vite, React Router (hash routing),
  `localStorage` for persistence. No backend.
- **Current phase:** Phase 1 — manual question banks, no LLM, no Canvas. See
  [planning.md](planning.md) for the full phase breakdown.

## Commands

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173
npm run build    # type-check (tsc -b) then build to dist/
npm run preview  # serve the production build locally
```

There is no separate lint/test step yet; `npm run build` is the gate — it runs
`tsc` in strict mode and fails on type or unused-symbol errors.

## Architecture notes for future changes

- **State lives in one place:** [src/context/AppContext.tsx](src/context/AppContext.tsx)
  holds all banks and games and exposes CRUD methods. It persists to
  `localStorage` via [src/lib/storage.ts](src/lib/storage.ts) on every change.
  Add new persisted entities here, not in component-local state.
- **Storage keys:** `owl_jeopardy.banks` and `owl_jeopardy.games`. All reads go
  through `storage.ts` so JSON parse errors are handled in one spot.
- **Games snapshot their questions.** When a game is created it copies the
  bank's questions, so editing a bank later never disturbs an in-progress game.
  Preserve this behavior.
- **Board layout** is derived, not stored: [src/lib/board.ts](src/lib/board.ts)
  turns a flat `Question[]` into columns (one per category, sorted by points).
- **Routing:** hash router (`/#/...`) is used deliberately so the production
  build works when opened directly from disk. The play screen renders outside
  the standard `Layout` for a full-bleed board.
- **Types** are centralized in [src/types.ts](src/types.ts):
  `Question`, `QuestionBank`, `Player`, `Game`.

## Conventions

- TypeScript strict mode; no unused locals/params (the build enforces this).
- Functional React components with hooks; no class components.
- Styling is plain CSS in [src/styles/global.css](src/styles/global.css) using
  CSS custom properties (design tokens) at `:root`. Reuse the existing `.btn`,
  `.card`, `.field`, `.modal` classes rather than introducing a CSS framework.
- Keep LLM / Canvas / network integrations OUT until the user advances the
  project to Phase 2 or 3.

## How Claude Code was used to build this project

This project was scaffolded and implemented end-to-end with Claude Code. The
workflow:

1. **Environment check** — verified Node/npm availability and confirmed the
   working directory was empty before scaffolding.
2. **Project scaffolding** — Claude wrote the Vite + React + TypeScript config
   (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`) by hand
   rather than running an interactive generator, then ran `npm install`.
3. **Implementation** — built the domain types, the `localStorage` storage
   layer, the app-wide context, and all pages/components for both the game
   frontend and the question-bank management frontend.
4. **Verification** — ran `npm run build` to type-check, fixed a TypeScript
   project-reference error (`tsconfig.node.json` `noEmit`), then launched the
   dev server and drove the full flow in a live browser preview:
   created a game, opened a question tile, revealed the answer, awarded points,
   and confirmed the scoreboard, "used tile" state, progress counter, and
   `localStorage` persistence all worked.
5. **Documentation** — generated `README.md`, this `CLAUDE.md`, and
   [planning.md](planning.md).

### Tips for continuing with Claude Code

- Point Claude at [planning.md](planning.md) when starting Phase 2/3 work — it
  documents the exact integration seams (the storage layer and `AppContext`).
- Run `npm run build` after changes; it is the project's correctness gate.
- The seeded sample bank (`src/lib/sampleData.ts`) is handy for manual testing —
  clearing browser storage re-seeds it.
