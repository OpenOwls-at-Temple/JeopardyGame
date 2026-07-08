# LLM Integration

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> **Owner: Wei.**
> This document describes the design, rationale, and known gaps of the AI question-generation
> pipeline in `JeopardyGame-phase1` (`branch2`).

---

## What the LLM Does in This App

| Responsibility | Description |
|----------------|-------------|
| Question generation from a topic | Given a topic, categories, point values, and a difficulty tier, generate one Jeopardy-style question per (category × point value) pair |
| Question generation from slides | Same, but grounded in text extracted from an uploaded `.pptx`/`.pdf` — Claude is instructed to use only facts present in that material |
| Streaming delivery | Questions are streamed to the UI one at a time as they're generated, not returned as one blocking response |

The LLM is a **question producer only** — it never touches game play, scoring, or persistence
directly. Its entire contract with the rest of the app is `(topic, categories, pointValues,
difficulty, slideContext?) → Question[]`.

---

## ⚠️ Architectural Gap vs. the Reference Design

`owl-jeopardy-pilot` scopes LLM generation to **Phase 2**, called **server-side only**, with a
hybrid BYOK key model, per-user daily quotas, a usage-logging table, and — critically — a
**draft/sign-off step** where nothing enters the bank until the teacher explicitly approves it.

This repo shipped generation in **Phase 1**, and:

- **Calls Claude directly from the browser.** The teacher's Anthropic API key is sent in the
  `x-api-key` header from client-side code (using
  `anthropic-dangerous-direct-browser-calls: true`). Anyone with DevTools open on that machine can
  read the key from the request headers or from `localStorage` (`owl_jeopardy.anthropic_key`, if
  "save key" was checked).
- **Has no usage quota or cost ceiling.** A teacher's own key has no app-side rate limit; the only
  cap is whatever limit they've set on their own Anthropic account.
- **Has no draft/sign-off queue.** Selecting questions in the review table and clicking "Add" writes
  them straight into the bank — there's no intermediate review-and-approve state beyond that one
  table.

This is acceptable for a single-teacher, single-device prototype (the classroom equivalent of "it's
your own laptop, your own key") but is **not safe to ship multi-user** as-is. This is a known,
flagged trade-off, not an oversight, and per Professor Pang's 2026-06-24 feedback it's now spec'd as a concrete
next-iteration feature — see `features.md` Feature 6 and the **Migration Plan** below for the full
technical design, ready for team review before any code is written.

---

## Model

| Setting | Value |
|---------|-------|
| Model | `claude-haiku-4-5-20251001` |
| Why Haiku | Question generation is a light, structured task; Haiku is fast and cheap. A typical generation (3 categories × 5 points = 15 questions) costs roughly $0.001 |
| When to consider Sonnet | If teachers report generated questions are too simple or factually off for harder topics — would need a `model` field added to `GenerateOptions` |
| Called from | The browser, directly (`src/lib/aiGenerate.ts`) — see the gap above |
| API key location | Entered by the teacher in `AIGenerateModal.tsx`; optionally persisted to `localStorage` under `owl_jeopardy.anthropic_key`. Never an env var, never committed |

---

## Prompts

All prompt construction lives in `src/lib/aiGenerate.ts` (`buildUserPrompt`, `DIFFICULTY_INSTRUCTIONS`,
`SYSTEM_PROMPT`) — never inline elsewhere.

### System Prompt
```
You are a Jeopardy question writer for classroom review games.
When given a topic and categories, produce valid Jeopardy-style clues where the
"question" field is the clue shown to players and the "answer" field is the
expected response. Keep clues clear and educationally appropriate.
Always respond with valid JSON only — no markdown fences, no extra text.
```
Sets the persona, clarifies that `question` = clue / `answer` = response (without this the model
tends to swap them or always phrase clues as questions), and constrains output format to reduce
parse failures.

### Difficulty Calibration
Three fixed tiers, each with its own instruction block injected into the user prompt
(`DIFFICULTY_INSTRUCTIONS` in `aiGenerate.ts`):

| Tier | Instruction summary |
|------|---------------------|
| `easy` | Definitions, key vocabulary, basic facts; one obvious unambiguous answer |
| `medium` | Relationships, cause-and-effect, how things work; may combine two pieces of knowledge |
| `hard` | Precise mechanisms, exceptions, synthesis across concepts, quantitative detail |

Within a tier, point value still scales relative difficulty ("lower point values should be the
easier `{difficulty}` questions, higher point values the harder `{difficulty}` questions").

**Important:** the difficulty tier shapes the prompt only — it is **not** stored on the resulting
`Question`. This differs from the reference repo's persisted `difficulty (1–5)` field per question.

### Output Format — two variants
- **Non-streaming (`generateQuestions`):** asks for a single JSON array.
- **Streaming (`generateQuestionsStream`):** asks for **NDJSON** — one complete JSON object per
  line, no array wrapper — because a partial JSON array can't be parsed mid-stream, while each
  complete line can be parsed and emitted to the UI independently as it arrives.

### Slide-Grounded Generation
When `slideContext` is present (extracted via `slideParser.ts`, capped at 80,000 characters), it is
appended to the user prompt with an instruction to use **only** facts/terms from that material, not
general knowledge.

---

## Architecture

- **Prompt + API call:** `src/lib/aiGenerate.ts` — `generateQuestions()` (blocking) and
  `generateQuestionsStream()` (SSE + NDJSON, calls `onQuestion` per parsed line)
- **Slide text extraction:** `src/lib/slideParser.ts` — `jszip` + `DOMParser` with
  `getElementsByTagNameNS` for `.pptx` (CSS selectors are not namespace-safe across browsers for
  OOXML); `pdfjs-dist` for `.pdf`
- **Cache:** `src/lib/aiCache.ts` — LRU, max 10 entries in `localStorage`, keyed by
  `topic+sorted(categories)+sorted(pointValues)+difficulty`; slide-grounded results are never cached
- **UI:** `src/components/AIGenerateModal.tsx` — two screens (input → streaming review table),
  mounted from `src/pages/BankEditorPage.tsx`

### Call Flow
```
Teacher fills form in AIGenerateModal (topic, categories, points, difficulty[, slide file])
  → [if slide uploaded] slideParser.parseSlideFile() → extracted text
  → [cache check, skipped if slide present] aiCache.cacheGet(key)
      → hit: render cached Question[] immediately, offer "Regenerate"
      → miss: aiGenerate.generateQuestionsStream()
          → POST stream:true to api.anthropic.com (direct from browser)
          → parse SSE `content_block_delta` events → accumulate text → split on '\n'
          → each complete NDJSON line → shapeQuestion() → onQuestion() → table row appears
  → teacher deselects unwanted rows → "Add N Questions"
  → AppContext.updateBank({ ...bank, questions: [...bank.questions, ...selected] })
```

---

## Context & Token Management

| Concern | Decision |
|---------|----------|
| Max output tokens | 4096 |
| Slide context cap | First 80,000 characters of extracted text (no chunking/summarization beyond that) |
| Typical call size | ~400–800 input tokens + ~800–1500 output tokens for a 3×5 board ≈ $0.001 |
| Cache size | 10 entries max, LRU eviction, `localStorage` |
| What is never sent | Nothing beyond topic/category/point-value text and (if uploaded) slide text — no PII exists in this app to leak |

---

## Error Handling & Fallbacks

| Scenario | Handling |
|----------|----------|
| Empty topic / categories / points / API key | Client-side validation blocks submission with a specific message before any network call |
| `response.body` is null | Explicit guard throws `'Claude API returned no response body'` rather than crashing on `.getReader()` |
| Non-2xx response | Surfaces `Claude API error: {message}` from the API's own error body |
| Malformed JSON line mid-stream | Silently skipped (`tryParseLine` catches and continues — a partial line means more text is still arriving) |
| `localStorage` quota exceeded (cache write) | Caught and silently skipped — caching is a nice-to-have, never blocks the generation result from reaching the UI |
| Corrupted cache JSON on load | Guarded with `Array.isArray`; falls back to an empty cache rather than throwing |

There is **no retry-on-malformed-response** logic and **no schema validation** beyond the loose
`shapeQuestion()` coercion (`String(raw.category ?? 'General')`, etc.) — unlike the reference
design's Pydantic-validated, schema-enforced tool-use output. This is acceptable risk for a single
teacher reviewing the output before adding it, but would need hardening before any unattended or
multi-user use.

---

## Privacy & Safety

- **Sent to Claude:** topic, category names, point values, difficulty tier, and (if uploaded) slide
  text. Nothing else — there is no user account or PII in this app to send.
- **API key handling:** see the Architectural Gap section above — this is the actual privacy/security
  concern in this design, not data sent to the model.
- **Human in the loop:** every generated question is shown in a review table and must be individually
  left checked before "Add" writes it to the bank — but there is no formal accept/reject *workflow*
  state (no `question_drafts` table, no audit trail of what was generated vs. kept).

---

## Migration Plan — Server-Side LLM Proxy (spec'd as `features.md` Feature 6)

Per Professor Pang's guidance (2026-06-28 + confirmed 2026-07-05): **FastAPI on Render**,
**Supabase Postgres**, **LiteLLM** as the LLM abstraction layer (model switchable via `.env`,
zero code change), **DeepSeek** for local/free testing, **hard daily token quota**.

### Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Backend | FastAPI (Python) | Deployed on Render as a Web Service |
| Database | Supabase Postgres | Managed; used for `llm_usage` quota tracking |
| LLM abstraction | **LiteLLM** (`pip install litellm`) | Unified interface for 100+ providers; confirmed by Professor Pang 2026-07-05 |
| Local / testing model | DeepSeek (`deepseek/deepseek-chat`) | Free via DeepSeek API or local Ollama |
| Production model | Any LiteLLM-supported provider | Claude, OpenAI, etc. — swap by changing `LLM_MODEL`, zero code change |
| Frontend host | Render Static Site (or Vercel) | Same Vite build as today |

### Endpoint contract

**`POST /api/generate`**

Request body (JSON):
```json
{
  "topic": "string",
  "categories": ["string"],
  "pointValues": [100, 200, 300],
  "difficulty": "easy | medium | hard",
  "slideContext": "string (optional)"
}
```
Note: `apiKey` is gone — the backend reads all credentials from env vars.

Response (streaming): `Content-Type: text/event-stream`
```
data: {"id":"...","category":"History","question":"...","answer":"...","points":100}

data: {"id":"...","category":"History","question":"...","answer":"...","points":200}

data: [DONE]
```
Each `data:` event carries one complete, parseable JSON object — cleaner than Anthropic's raw
`content_block_delta` format. This lets `aiGenerate.ts`'s streaming parser simplify.

Error (quota hit): `HTTP 429 { "error": "Daily token quota exceeded — try again tomorrow" }`

### Environment variables (server-side only)

LiteLLM reads provider API keys from standard env var names automatically — no custom wrapper needed.

| Variable | Description | Local default |
|----------|-------------|---------------|
| `LLM_MODEL` | LiteLLM model string (e.g. `deepseek/deepseek-chat`, `claude-haiku-4-5-20251001`, `gpt-4o-mini`) | `deepseek/deepseek-chat` |
| `DEEPSEEK_API_KEY` | DeepSeek API key — read by LiteLLM automatically when model is `deepseek/...` | (your DeepSeek key) |
| `ANTHROPIC_API_KEY` | Anthropic key — read by LiteLLM automatically when model is `claude-...` | — |
| `OPENAI_API_KEY` | OpenAI key — read by LiteLLM automatically when model is `gpt-...` | — |
| `LLM_DAILY_TOKEN_CAP` | Hard limit on total input+output tokens per calendar day | `100000` |
| `SUPABASE_URL` | Supabase project URL | — |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) | — |

None of these are ever sent to the browser. No `.env` file is committed to the repo.

### Quota enforcement design

1. On each `POST /api/generate` request:
   - Query `llm_usage` table for today's `SUM(tokens_input + tokens_output)`
   - If sum ≥ `LLM_DAILY_TOKEN_CAP` → return `429` immediately
2. After a successful generation call:
   - Read `usage.input_tokens` + `usage.output_tokens` from the LLM response
   - `UPSERT` into `llm_usage (date, tokens_input, tokens_output)` (aggregate per day)

`llm_usage` schema:
```sql
CREATE TABLE llm_usage (
  date        DATE PRIMARY KEY,
  tokens_input  BIGINT NOT NULL DEFAULT 0,
  tokens_output BIGINT NOT NULL DEFAULT 0
);
```

### Frontend changes implied (not yet made)

- `GenerateOptions` drops `apiKey`
- `aiGenerate.ts`'s two `fetch()` calls point at `/api/generate`; remove `x-api-key` /
  `anthropic-dangerous-direct-browser-calls` headers; simplify SSE parser to read standard
  `data: <json>` events (one complete JSON object per event) rather than Anthropic's
  `content_block_delta` format
- `AIGenerateModal.tsx` removes the API key field, "save key" checkbox, all
  `owl_jeopardy.anthropic_key` `localStorage` reads/writes
- No changes to `AIGenerateModal.tsx`'s review-table logic, `aiCache.ts`, or `slideParser.ts`

### Switching models (the key design goal)

LiteLLM uses provider-prefixed model strings. To switch providers, change only `LLM_MODEL`
(and set the matching `*_API_KEY`) in `.env` — zero code changes:

```bash
# DeepSeek (local default — free)
LLM_MODEL=deepseek/deepseek-chat
DEEPSEEK_API_KEY=sk-...

# Claude Haiku (Anthropic)
LLM_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...

# Local Ollama (free, no key)
LLM_MODEL=ollama/llama3
```

LiteLLM resolves the provider from the model string prefix and reads the correct key automatically.

### Deferred to a later iteration (needs auth first)
- BYOK (bring-your-own-key) as a user-level fallback
- Per-user quotas tied to identity, and per-user rows in `llm_usage`
- The draft/sign-off review queue — the existing review-table-then-Add flow stays for this iteration

---

## Evaluation

No formal evaluation has been run. If this continues to be developed:

| Metric | How to Measure |
|--------|---------------|
| Selection rate | Fraction of streamed questions the teacher leaves checked when clicking "Add" |
| Difficulty calibration accuracy | Manual spot-check: do `easy`/`hard` outputs actually read as easier/harder? |
| Slide-grounding accuracy | Manual spot-check: does every generated fact trace back to the uploaded slide text? |
| Parse failure rate | Could be logged client-side (count of `tryParseLine` catch blocks hit) — not currently tracked |

---

## Prompt Iteration Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-06-15 | Initial generation pipeline (`generateQuestions`, blocking JSON array) | Baseline AI feature on `branch2` |
| 2026-06-22 | Added difficulty calibration (`easy`/`medium`/`hard` instruction blocks) | Teacher control over question difficulty |
| 2026-06-22 | Added streaming (`generateQuestionsStream`, SSE + NDJSON) | Avoid a long blocking spinner on large boards |
| 2026-06-22 | Added slide ingestion (`slideParser.ts`, grounded prompt variant) | Generate from actual lecture content, not just a topic string |
| 2026-06-22 | Added LRU result cache (`aiCache.ts`) | Avoid re-spending tokens on repeated generation during iteration |
