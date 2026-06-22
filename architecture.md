# Owl Jeopardy — System Architecture

> Written from the perspective of the system architect.
> Wei owns the LLM integration seam; see [llm-integration.md](llm-integration.md) for that deep-dive.

---

## 1. Guiding principle

**The game engine is a consumer of `Question[]`. It never cares where those questions came from.**

Every architectural decision flows from this: a teacher who types questions manually, an LLM that generates them from a topic, and a future pipeline that extracts them from uploaded slides are all just different *producers* of the same type. The board, the modal, and the scoreboard code stay untouched across all three phases.

---

## 2. Layered architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│   Pages: Home, Banks, BankEditor, Games, GameSetup, Play     │
│   Components: GameBoard, QuestionModal, Scoreboard, Modal    │
└────────────────────────┬────────────────────────────────────┘
                         │ React context (useApp hook)
┌────────────────────────▼────────────────────────────────────┐
│                      State Layer                             │
│   AppContext — single source of truth for banks + games      │
│   Exposes CRUD methods; components never mutate state directly│
└────────────────────────┬────────────────────────────────────┘
                         │ read/write calls
┌────────────────────────▼────────────────────────────────────┐
│                   Persistence Layer                          │
│   storage.ts — JSON serialization to/from localStorage       │
│   Keys: owl_jeopardy.banks  owl_jeopardy.games               │
└─────────────────────────────────────────────────────────────┘

                  ← External producers →
┌──────────────────────┐   ┌──────────────────────────────────┐
│   Manual entry UI    │   │   AI / LLM pipeline (Phase 2+)   │
│   BankEditorPage     │   │   aiGenerate.ts → Claude API     │
│   Draft → Question   │   │   Slide ingestion (Phase 3)      │
└──────────┬───────────┘   └────────────────┬─────────────────┘
           │                                │
           └──────────── Question[] ────────┘
                              │
                     AppContext.updateBank()
```

All question producers funnel through `AppContext.updateBank()`. This is the single entry point for content changes.

---

## 3. Data model

```typescript
// The core contract. Every producer must emit this shape.
interface Question {
  id: string        // client-generated UUID
  category: string  // column header on the board
  question: string  // clue shown to players
  answer: string    // revealed after the question
  points: number    // difficulty proxy; also the tile label
}

interface QuestionBank {
  id: string
  name: string
  description: string
  questions: Question[]
  createdAt: number   // unix ms
  updatedAt: number
}

interface Game {
  id: string
  bankId: string         // reference only — for display
  bankName: string
  questions: Question[]  // SNAPSHOT taken at game creation time
  players: Player[]
  answered: string[]     // ids of played tiles
  createdAt: number
  updatedAt: number
}
```

**Critical invariant:** `Game.questions` is a snapshot. After a game is created, editing or deleting the source bank has zero effect on it. This must be preserved in all phases.

---

## 4. Module responsibilities

| Module | Responsibility | Must not |
|--------|---------------|----------|
| `types.ts` | Domain types only | Import anything |
| `lib/storage.ts` | JSON ↔ localStorage; id generation | Know about React or business logic |
| `lib/board.ts` | Derive board columns from flat `Question[]` | Store any state |
| `lib/sampleData.ts` | First-run seed data | Be imported outside AppContext |
| `context/AppContext.tsx` | Own all state; expose CRUD; persist to storage | Render UI or call external APIs |
| `lib/aiGenerate.ts` | Call Claude API; return `Question[]` | Touch AppContext or React state |
| `components/AIGenerateModal.tsx` | Review UI for AI-generated questions | Call the API directly (delegates to aiGenerate.ts) |

---

## 5. Data flow diagrams

### 5a. Manual question creation
```
User fills form in BankEditorPage
  → setDraft(question)
  → saveDraft()
  → AppContext.updateBank({ ...bank, questions: [...bank.questions, newQ] })
  → setBanks(updated)  [triggers useEffect]
  → storage.saveBanks(updated)  [written to localStorage]
  → Component re-renders with new question in table
```

### 5b. AI question generation (Phase 2)
```
User opens AIGenerateModal
  → Fills topic, categories, point values, API key
  → clicks Generate
  → aiGenerate.ts: POST /v1/messages to Claude API
  → Returns Question[]
  → Modal renders review table (teacher picks questions)
  → onAdd(selectedQuestions)
  → AppContext.updateBank({ ...bank, questions: [...bank.questions, ...selectedQuestions] })
  → Same localStorage write path as 5a
```

### 5c. Slide ingestion (Phase 3 — planned)
```
User uploads PPTX/PDF
  → slideParser.ts extracts text chunks
  → Each chunk becomes context in aiGenerate prompt
  → Same Question[] output
  → Same review + save path as 5b
```

The game play path (5d) is untouched by all of the above.

---

## 6. Extension seams

These are the exact points where future work plugs in, with zero changes to existing code:

### Seam A — New question producer
Add a new file in `src/lib/` that returns `Promise<Question[]>`. Wire it to a button in `BankEditorPage.tsx`. Call `AppContext.updateBank()`. Done.

### Seam B — New entity type (e.g. Flashcard)
1. Add type to `types.ts`
2. Add storage key + load/save to `storage.ts`
3. Add state + CRUD to `AppContext`
4. Add pages/components

The game engine is never touched.

### Seam C — Backend / proxy
Currently `aiGenerate.ts` calls Claude directly from the browser (using the `anthropic-dangerous-direct-browser-calls` header). To move the key server-side:
- Replace the `fetch` call in `aiGenerate.ts` with a call to `/api/generate`
- Add a thin server (Express, Hono, Next.js API route) that forwards to Anthropic
- The `GenerateOptions` interface and the returned `Question[]` shape are unchanged
- No UI or context code changes required

### Seam D — Persistence upgrade
All persistence is in `storage.ts`. To swap localStorage for IndexedDB, a remote DB, or Canvas LMS storage: only `storage.ts` changes. The rest of the app calls the same `loadBanks()` / `saveBanks()` interface.

---

## 7. Phase status

| Phase | What changes | What stays the same |
|-------|-------------|---------------------|
| Phase 1 | (baseline) | Everything |
| Phase 2 | `src/lib/aiGenerate.ts` added; button + modal in BankEditorPage | All game logic, types, storage |
| Phase 3 | `src/lib/slideParser.ts` added; upload UI added; Flashcard type + storage added | Everything from Phase 1 + 2 |

---

## 8. Things deliberately out of scope (all phases)

- Authentication / user accounts
- Multi-device sync
- Real-time multiplayer
- Canvas LMS deep integration (file sync, grade passback) — possible but not planned
- Mobile-native app — the web app is responsive enough for tablet use in class
