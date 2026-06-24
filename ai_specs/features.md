# Features

> **OpenOwls SDD** — Read by end users and the product owner.
> Defines what the application does, written in plain language.
>
> **Note on phases in this repo:** this is the `JeopardyGame-phase1` prototype, scoped independently
> from `owl-jeopardy-pilot`'s phase plan. Below, "Phase 1" = the manual game (no AI), and "Phase 2" =
> the AI generation work on `branch2` — both are **done**. This intentionally jumps ahead of the
> reference repo, where AI generation is Phase 2 and is scoped to be server-side with quotas and a
> draft/sign-off step (see `llm-integration.md`). Several of the reference repo's Phase 1 must-haves
> (auth, admin, sharing, CSV import, the difficulty-by-row data model) are not built here at all — see
> **Out of Scope** below.

---

## Phase 1 — Manual Game (done)

### Feature 1: Question Bank Management
**As a** teacher,
**I want to** create, edit, and delete question banks with categories, point values, questions, and answers,
**So that** I have reusable content for review games.

**Acceptance Criteria:**
- [x] Given I open "Question Banks", when I create a bank, then I can name it and add a description
- [x] Given I am editing a bank, when I add a question, then I set its category, point value, question text, and answer text
- [x] Given a bank has questions, when I view it, then they are grouped by category and sorted by point value
- [x] Given I delete a question or bank, when I confirm, then it is removed immediately (hard delete — no soft-delete/recovery)

---

### Feature 2: Game Creation & Play
**As a** teacher,
**I want to** create a game from a bank and run it on a shared screen with team scoring,
**So that** my class can play a live review session.

**Acceptance Criteria:**
- [x] Given I click "Make Game" on a bank, when I name the game and add players/teams, then a game is created with a **snapshot** of the bank's current questions (later bank edits never affect this game)
- [x] Given the game board is shown, when I click a tile, then the question appears full-screen with a "Reveal Answer" action
- [x] Given the answer is revealed, when I click ±points next to a team, then that team's score updates and the tile is marked used/disabled
- [x] Given tiles are used, when I look at the header, then a live `answered / total` counter is shown
- [x] Given I want to replay, when I click "Reset", then all tiles are re-enabled and scores zero out
- [x] Given I close the browser mid-game, when I reopen it, then scores and used tiles are restored from `localStorage`

---

## Phase 2 — AI Question Generation (done, shipped ahead of the reference repo's Phase 2 design)

### Feature 3: Generate Questions from a Topic
**As a** teacher,
**I want to** describe a topic, categories, point values, and a difficulty level, and have Claude draft a full board,
**So that** I don't have to write every question by hand.

**Acceptance Criteria:**
- [x] Given I click "✨ Generate with AI", when I fill in topic/categories/points/difficulty and my own Anthropic API key, then questions stream into a review table one at a time as Claude generates them (SSE + NDJSON)
- [x] Given the review table, when generation finishes, then I can deselect any question before adding the rest to my bank
- [x] Given I pick a difficulty (easy/medium/hard), when questions are generated, then the prompt instructs Claude to calibrate accordingly, scaling further by point value within that tier
- [x] **Divergence from reference:** the API key is supplied by the teacher and used **directly from the browser** (`anthropic-dangerous-direct-browser-calls`). There is no server-side proxy, no system-wide key, no per-user quota, and no usage logging. See `llm-integration.md` for the risk and the planned mitigation.
- [x] **Divergence from reference:** there is no draft/sign-off queue — selecting a question in the review table and clicking "Add" writes it straight into the bank.

---

### Feature 4: Generate Questions from Uploaded Slides
**As a** teacher,
**I want to** upload a lecture `.pptx` or `.pdf` and have Claude generate questions grounded in that material,
**So that** review questions match what I actually taught.

**Acceptance Criteria:**
- [x] Given I upload a `.pptx`, when it's parsed, then slide text is extracted via `jszip` + XML-namespace-safe DOM parsing and injected as source material into the generation prompt
- [x] Given I upload a `.pdf`, when it's parsed, then page text is extracted via `pdfjs-dist`
- [x] Given slide text is present, when Claude generates questions, then it is instructed to use only facts/terms from the slide content, not general knowledge
- [x] Given a topic field is empty, when a file is parsed, then the topic auto-fills from the file name

---

### Feature 5: Result Caching
**As a** teacher,
**I want to** re-generate for the same topic/categories/points/difficulty without waiting on the API again,
**So that** iterating on a board is fast and doesn't cost extra tokens.

**Acceptance Criteria:**
- [x] Given I generate for a topic/category/point/difficulty combination already in the LRU cache (max 10 entries, `localStorage`), when I click Generate, then cached results load instantly with a "⚡ Loaded from cache" badge
- [x] Given a cache hit, when I want fresh results anyway, then I can click "↺ Regenerate" to bypass the cache
- [x] Given a slide was uploaded, when I generate, then the result is **never** cached (slide content is document-specific and would go stale)

---

## Out of Scope (present in `owl-jeopardy-pilot`'s Phase 1, not built here)

- **Authentication / SSO** — no Microsoft Entra ID, no login at all; the app is single-user-per-browser
- **Admin user management** — no admin role, no allowlist
- **Sharing & cloning** — banks/games cannot be shared between users or accounts
- **CSV / JSON bulk import or export** — questions can only be entered one at a time, or generated
- **`subject_area → category → question(difficulty 1–5)` data model** — this repo's `Question` type
  is flat: `{ id, category, question, answer, points }`. Point value is the only difficulty proxy
  (and, for AI-generated content, the generator's easy/medium/hard toggle — that difficulty is not
  stored per-question)
- **Random/manual board-fill from a larger pool** — a game always uses the *entire* current bank, not
  a subset drawn from a larger item pool

## Out of Scope (matches reference repo — true non-goals for both)

- Student-facing devices, buzzers, or join codes
- Real-time multiplayer / websockets
- Native mobile app
- Canvas LMS integration (gradebook, LTI, or content pull)
