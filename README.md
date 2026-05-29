# 🦉 Owl Jeopardy

An AI-powered Jeopardy-style review game for class review sessions.

> **Phase 1 (current):** No LLM. You build question banks by hand and run live
> games from them. Everything is stored locally in your browser — no server, no
> Canvas, no Claude API yet.
>
> Future phases will add LLM-generated questions (Phase 2) and Q&A/flashcards
> generated from uploaded lecture slides (Phase 3).

## Features

**Question Bank management**
- Create, rename, and delete question banks.
- Add, edit, and delete questions. Each question has a **category**, **question
  text**, **answer text**, and **point value**.
- Questions are grouped by category for easy review.

**Game play**
- Turn any bank into a Jeopardy-style board (categories across the top, point
  values down each column).
- Add any number of players or teams.
- Click a tile to show the question, reveal the answer, and award (or subtract)
  points to a team.
- Live scoreboard with a leader indicator.
- Games are saved automatically — close the tab and resume later with scores and
  board progress intact.

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev server and build
- [React Router](https://reactrouter.com/) (hash routing) for navigation
- `localStorage` for persistence — no backend required

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

Build a static production bundle:

```bash
npm run build    # type-checks then outputs to dist/
npm run preview  # serve the production build locally
```

## Project structure

```
src/
  main.tsx              App entry (router + global state provider)
  App.tsx               Route definitions
  types.ts              Domain types: Question, QuestionBank, Player, Game
  lib/
    storage.ts          localStorage read/write + id generation
    sampleData.ts       Seed bank shown on first launch
    board.ts            Group questions into a Jeopardy board
  context/
    AppContext.tsx      App-wide state + CRUD for banks and games
  components/
    Layout.tsx          Header + nav shell
    Modal.tsx           Reusable modal dialog
    GameBoard.tsx       The category/point tile grid
    QuestionModal.tsx   Question reveal + point awarding
    Scoreboard.tsx      Team scores
  pages/
    HomePage.tsx
    BanksPage.tsx       List / create banks
    BankEditorPage.tsx  Add / edit / delete questions
    GamesPage.tsx       List / load / delete saved games
    GameSetupPage.tsx   Create a game from a bank
    GamePlayPage.tsx    Live game board
```

## Data & storage

All data lives in the browser under two `localStorage` keys
(`owl_jeopardy.banks` and `owl_jeopardy.games`). Creating a game takes a
**snapshot** of its source bank's questions, so editing the bank afterwards
never disturbs an in-progress game. Clearing your browser storage resets the
app (a sample bank is re-seeded on next launch).
