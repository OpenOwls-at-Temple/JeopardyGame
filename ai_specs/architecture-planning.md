# Architecture Planning

> **OpenOwls SDD** — Read by the system architect and software engineers.
> Defines the folder structure, key design decisions, and implementation details.
> Claude Code uses this file to understand how the codebase is organized.

---

## System Architecture Overview

This is a **single-tier, frontend-only** web app — there is no backend, no database, and no
authentication layer. Everything runs in the browser:

- **Frontend:** React 18 SPA (Vite), hash routing (`/#/...`) so the production build works opened
  directly from disk (`file://`)
- **State:** one React context (`AppContext`) holds all banks and games in memory and exposes CRUD
  methods; components never touch storage directly
- **Persistence:** `localStorage`, read/written through a single module (`storage.ts`)
- **AI:** the Anthropic API is called **directly from the browser** using a teacher-supplied API key
  — there is no backend to proxy through (see `llm-integration.md` for why this is a deliberate,
  flagged trade-off rather than the target end state)

**Current state (branch2, frontend-only):**
```
Browser (React SPA)
  ├─▶ AppContext ──▶ storage.ts ──▶ localStorage (owl_jeopardy.banks / .games)
  └─▶ aiGenerate.ts ──▶ https://api.anthropic.com (direct, teacher's own API key)  ⚠️ security gap
       aiCache.ts ──▶ localStorage (owl_jeopardy.ai_cache)
       slideParser.ts ──▶ jszip / pdfjs-dist (in-browser parsing, no upload to a server)
```

**Planned (Feature 6 + 7, full-stack):**
```
Browser (React SPA)
  ├─▶ AppContext ──▶ storage.ts ──▶ localStorage (owl_jeopardy.banks / .games)
  └─▶ aiGenerate.ts ──▶ POST /api/generate ──▶ FastAPI (Render)
       aiCache.ts ──▶ localStorage                  ├─▶ OpenAI-compat LLM (DeepSeek / GPT-4o / ...)
       [slideParser moved server-side]              └─▶ Supabase Postgres (llm_usage quota table)
                                                         Supabase Storage (slide files, Feature 7)
```

**Guiding principle:** the game engine is a pure consumer of `Question[]`. It never knows or cares
whether a question was typed by hand, generated from a topic, or generated from uploaded slides —
all three are just different *producers* of the same type, funneled through `AppContext.updateBank()`.
This is what makes the AI features purely additive: zero changes to the board, scoring, or game-play code.

---

## Folder Structure

```
project-root/
├── CLAUDE.md
├── progress.md
├── ai_specs/
└── src/
    ├── types.ts              # Question, QuestionBank, Player, Game
    ├── lib/
    │   ├── storage.ts        # localStorage read/write + id generation
    │   ├── sampleData.ts     # First-run seed bank
    │   ├── board.ts          # Flat Question[] -> board columns (derived, never stored)
    │   ├── aiGenerate.ts     # Claude API calls (streaming + non-streaming), prompt building
    │   ├── aiCache.ts        # LRU cache for generation results (localStorage)
    │   └── slideParser.ts    # .pptx / .pdf -> extracted text for the generation prompt
    ├── context/
    │   └── AppContext.tsx    # App-wide state + CRUD, persisted to storage on every change
    ├── components/
    │   ├── Layout, Modal, GameBoard, QuestionModal, Scoreboard
    │   └── AIGenerateModal.tsx  # Input + streaming review UI for AI generation
    └── pages/
        Home, BanksPage, BankEditorPage, GamesPage, GameSetupPage, PlayPage
```

There is no `backend/` or `frontend/` split — `src/` is the whole app.

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Persistence | `localStorage`, no backend | Zero-setup prototype; teacher can run it with `npm run dev` and nothing else |
| LLM calls | **Client-side**, direct to Anthropic, teacher's own API key | No backend exists to proxy through; deliberate Phase-1 trade-off, not the target — see `llm-integration.md` |
| Routing | Hash router (`/#/...`) | Production build works opened directly from disk, no server-side route config needed |
| Game snapshotting | `Game.questions` is copied from the bank at creation time, not referenced live | Editing or deleting a bank afterwards must never corrupt an in-progress or saved game — the single most important data-integrity rule in this codebase |
| Board layout | Derived (`board.ts` groups by category, sorts by points) | Never stored — avoids redundant state that could drift from the source `Question[]` |
| AI streaming format | NDJSON over SSE, not a JSON array | A partial JSON array can't be parsed mid-stream; each newline-terminated object can be parsed independently as it arrives |
| AI result caching | LRU, max 10 entries, keyed by `topic+categories+points+difficulty` | Repeated generation during iteration shouldn't re-spend tokens; excluded for slide-grounded results since those are document-specific |

---

## Data Models

This app has no database — these are the TypeScript shapes in `src/types.ts`, persisted as JSON.

### Question
| Field | Type | Description |
|-------|------|-------------|
| `id` | string (client UUID) | |
| `category` | string | Column header on the board |
| `question` | string | Clue shown to players |
| `answer` | string | Revealed after the question |
| `points` | number | Tile label; only difficulty proxy stored |

### QuestionBank
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | |
| `name` / `description` | string | |
| `questions` | `Question[]` | |
| `createdAt` / `updatedAt` | number (unix ms) | |

### Game
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | |
| `bankId` / `bankName` | string | Reference only, for display |
| `questions` | `Question[]` | **Snapshot** taken at creation time — see Key Design Decisions |
| `players` | `Player[]` | `{ id, name, score }` |
| `answered` | string[] | ids of played tiles |
| `createdAt` / `updatedAt` | number | |

There is no `subject_area` / `category`-as-entity / `difficulty(1–5)` hierarchy — `category` is a
free-text string on each question, and there is no stored numeric difficulty (the AI generator's
easy/medium/hard toggle only shapes the prompt; it is not persisted on the resulting `Question`).

---

## API Endpoints

**Current state:** none — the only outbound call is the browser hitting Anthropic directly from `aiGenerate.ts`.

**Planned (Feature 6):** a FastAPI backend adds one route, called from the browser and from no one else:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generate` | Accept generation options; check Supabase quota; call LLM (OpenAI-compatible); stream NDJSON response; log token usage |
| `POST` | `/api/upload-slide` | (Feature 7) Accept `.pptx`/`.pdf`; store in Supabase Storage; parse server-side; return extracted text |

---

## LLM Integration

- **Where the LLM layer lives:** `src/lib/aiGenerate.ts`, called directly from
  `src/components/AIGenerateModal.tsx` — there is no service layer or backend route
- **Called from the browser, not a server** — this is the main architectural divergence from
  `owl-jeopardy-pilot`; full detail and the planned mitigation are in `ai_specs/llm-integration.md`

---

## Environment Variables

**Current state:** none — no `.env` file exists. The API key is entered by the teacher at runtime.

**Planned (Feature 6):** the FastAPI backend uses a `.env` file (never committed). See `deployment.md`
for the full env var table. The frontend build still has no env vars — all secrets stay on the server.

---

## Extension Seams

- **New question producer:** add a module under `src/lib/` returning `Promise<Question[]>`, wire a
  button in `BankEditorPage.tsx`, call `AppContext.updateBank()`. Done.
- **Backend / proxy (spec'd as `features.md` Feature 6, not yet built):** replace the `fetch` in
  `aiGenerate.ts` with a call to `/api/generate`; add a FastAPI backend (Python, Render) that reads
  `LLM_*` env vars and calls any OpenAI-compatible provider. `GenerateOptions` drops `apiKey`. Full
  endpoint contract, env vars, and quota design in `ai_specs/llm-integration.md` Migration Plan.
- **User-level file storage (spec'd as `features.md` Feature 7, not yet built):** add
  `POST /api/upload-slide` to the FastAPI backend; store files in Supabase Storage; move slide
  parsing server-side (`python-pptx`, `pypdf`). No change to the browser's flow — just a new API call.
- **Persistence upgrade:** all storage logic is isolated in `storage.ts` — swapping `localStorage`
  for Supabase Postgres (once auth is added and banks/games become user-specific) only touches that one file.
- **New entity type** (e.g. a `difficulty`-bearing question model, or flashcards): add the type to
  `types.ts`, a storage key + load/save in `storage.ts`, state + CRUD in `AppContext`, then pages.

---

## Deployment

There is no deployment target yet — see `ai_specs/deployment.md`.
