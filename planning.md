# Owl Jeopardy — Planning & Design

🦉 **Owl Jeopardy** is an AI-powered, Jeopardy-style review game for classroom
review sessions. This document covers the Phase 1 plan, what is currently built,
the design decisions behind it, and how the future LLM phases will plug in.

---

## Phase roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Manual question banks + game play. No LLM, no Canvas. | ✅ Built |
| **Phase 2** | LLM generates questions and answers. | 🔜 Future |
| **Phase 3** | Faculty upload lecture slides → LLM generates Q&A and study flashcards. | 🔜 Future |

The product is built **incrementally**: Phase 1 is a fully usable game on its
own. Later phases add content-generation on top of the same data model and UI,
without rewriting them.

---

## Phase 1 — Plan & Goals

**Goal:** a working, self-contained prototype that a teacher can use to run a
review game in class today, with no accounts, no server, and no AI.

### Requirements (from the brief)

1. **Game frontend**
   - Jeopardy-style board with categories and point values.
   - Select a question → show it → reveal the answer.
   - Track score for players/teams.
   - Clean, modern, classroom-suitable UI.
2. **Question bank / game management frontend**
   - Create and manage question banks.
   - Add, edit, delete questions (category, question text, answer text, point value).
   - Create a game from a question bank.
   - Save and load games.
3. **Constraints**
   - No LLM integration.
   - No Canvas API, no Claude API.
   - Simple local data storage; clean code structure.

---

## Current features (what's implemented)

### Question bank management
- Create, rename (Edit Details), and delete question banks.
- Add / edit / delete questions. Each question has **category**, **question
  text**, **answer text**, and **point value**.
- Questions are displayed grouped by category, sorted by point value.
- A category autocomplete (`<datalist>`) keeps category names consistent.
- A sample "Intro Biology" bank is seeded on first launch so the app is never
  empty; it can be edited or deleted freely.

### Game play
- Build a game from any bank: pick the bank, name the game, add any number of
  players/teams.
- Jeopardy board: one column per category, point-value tiles down each column.
  Columns with fewer questions are padded so the grid stays rectangular.
- Click a tile → modal shows the question → **Reveal Answer** → award or subtract
  the question's points to/from any team.
- Live scoreboard with a 👑 leader highlight; manual ±100 score correction.
- Answered tiles are disabled and greyed out; a progress counter shows
  `answered / total`; a celebratory note appears when the board is cleared.
- **Reset** clears the board and zeroes scores to replay.

### Persistence
- Everything is saved to `localStorage` automatically; saved games appear on the
  Games page and can be resumed (scores + board progress intact) or deleted.

---

## Design decisions

### Tech choices
- **React + TypeScript + Vite.** Fast dev server, strict typing as a correctness
  gate, minimal config. Familiar and easy to extend in later phases.
- **`localStorage`, no backend.** The brief asks for "simple local data
  storage." This keeps the prototype zero-setup (no DB, no server) and is a clean
  seam to later swap for a real backend if multi-device sync is ever needed.
- **Hash routing (`/#/...`).** Lets the production build run even when opened
  directly from the filesystem (`file://`) — useful for a teacher who just wants
  to double-click `index.html`. No server-side route config required.
- **Plain CSS with design tokens** (CSS custom properties at `:root`) instead of
  a UI framework — keeps the bundle small and the styling transparent, while
  still giving a clean, modern, themeable look.

### Data model (`src/types.ts`)
- `Question` — `{ id, category, question, answer, points }`. "Point value" doubles
  as difficulty, matching the brief.
- `QuestionBank` — a named collection of questions with timestamps.
- `Player` — `{ id, name, score }` (a "player" can be an individual or a team).
- `Game` — references its source bank but **stores its own snapshot** of the
  questions, plus players and the list of answered question ids.

### Key architectural decisions
- **Single source of truth in `AppContext`.** All banks and games live in one
  React context that wraps the localStorage layer and exposes CRUD methods. UI
  components never touch storage directly.
- **Centralized storage module** (`src/lib/storage.ts`) — all reads/writes and
  id generation go through one place, with defensive JSON parsing.
- **Games snapshot their questions at creation time.** Editing or deleting a bank
  afterwards never corrupts an in-progress or saved game. This is the most
  important data-integrity decision in Phase 1.
- **Derived board layout** (`src/lib/board.ts`) — the board is computed from the
  flat question list (group by category, sort by points), so we never store
  redundant board state that could drift.

### Project structure
```
src/
  types.ts              Domain types
  lib/
    storage.ts          localStorage read/write + id generation
    sampleData.ts       First-run seed bank
    board.ts            Flat questions -> board columns
  context/AppContext.tsx  App-wide state + CRUD, persisted to localStorage
  components/           Layout, Modal, GameBoard, QuestionModal, Scoreboard
  pages/                Home, Banks, BankEditor, Games, GameSetup, GamePlay
```

### Deliberate non-goals for Phase 1
- No authentication / user accounts.
- No server, database, or network calls.
- No Canvas LMS integration.
- No AI / LLM features.
- No multi-device sync (single browser, single machine).

---

## Phase 2 — LLM-generated Q&A (future)

**Goal:** let a user generate questions and answers with an LLM instead of (or in
addition to) typing them by hand.

### Integration points
- **New module `src/lib/ai.ts`** (or similar) that calls the Claude API and
  returns `Question[]` shaped exactly like the existing type. The rest of the app
  already consumes `Question[]`, so generated and manual questions are
  interchangeable.
- **`AppContext`** gains a method such as `addGeneratedQuestions(bankId, questions)`
  that funnels AI output through the same validation/CRUD path as manual entry.
  No changes needed to the board, game, or scoring code.
- **UI:** add a "Generate with AI" action on the Bank Editor page
  (`src/pages/BankEditorPage.tsx`) — a prompt for topic/difficulty/count that
  populates the same add-question flow, ideally with a review-before-save step so
  the teacher can edit generated content.
- **Keys/config:** introduce an API-key/setting surface (and likely a thin proxy)
  so the Claude API key is not exposed client-side. This is the point where a
  minimal backend may be introduced.

### Why it slots in cleanly
Because Phase 1 separates **content** (`Question`) from **presentation** (board,
modal, scoreboard) and routes all writes through `AppContext` + `storage.ts`, an
AI source is just another producer of `Question[]`.

---

## Phase 3 — Slides → Q&A + flashcards (future)

**Goal:** faculty upload lecture slides; the LLM generates questions, answers,
and study flashcards from them.

### Integration points
- **Ingestion module** to parse uploaded files (e.g. PPTX/PDF) into text. The
  extracted text becomes the prompt context for the Phase 2 generation pipeline,
  so Phase 3 builds directly on Phase 2's `ai.ts`.
- **New `Flashcard` type** and a `flashcards` collection in `AppContext` +
  `storage.ts`, mirroring how banks/games are stored today.
- **New UI surfaces:** an upload screen, a generation/review screen, and a
  flashcard study mode (separate from the game board).
- **Backend likely required** for file handling and to keep API keys and larger
  LLM calls server-side.

### Why it slots in cleanly
The storage + context pattern generalizes: flashcards are persisted the same way
banks and games are, and slide-derived questions reuse the Phase 2 generation
path. The Jeopardy game itself needs no changes — it simply gains richer banks to
draw from.

---

## Summary

Phase 1 delivers a complete, dependency-light classroom game with a clean
separation between data, state, and UI. That separation — centralized types, a
single storage module, and an `AppContext` that owns all CRUD — is exactly what
makes Phases 2 and 3 additive rather than disruptive: new content sources (LLM,
slides) and new content types (flashcards) plug into the existing seams without
touching the game-play experience.
