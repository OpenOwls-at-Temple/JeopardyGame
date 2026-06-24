# Domain Knowledge

> **OpenOwls SDD** — Read primarily by the AI coding assistant.
> Captures domain-specific concepts, terminology, and constraints not obvious from the code itself.

---

## Domain Overview

This application operates in the classroom-review-game domain: a teacher prepares trivia-style
content ahead of class, then runs a scored, team-based game on a shared screen during a live session.

---

## Key Concepts & Terminology

| Term | Definition |
|------|------------|
| Question Bank | A named, reusable collection of questions a teacher builds once and can draw multiple games from |
| Game | A *snapshot* of a bank's questions at the moment it was created, plus players and play state (scores, used tiles). Independent of later edits to the source bank |
| Category | A free-text label grouping questions into a board column. Not a stored entity — just a string field on each `Question` |
| Points | The dollar-value label on a tile. Doubles as the only difficulty signal that is actually persisted |
| Tile / Cell | One clickable square on the board, identified by its `Question.id`. Once played, it is added to `Game.answered` and disabled |
| Difficulty (generator) | A three-level (`easy`/`medium`/`hard`) instruction the teacher picks *only* when using AI generation — it shapes the prompt but is **not** saved on the resulting question |
| Bank Editor | The page where a teacher adds/edits/deletes questions by hand or triggers AI generation |
| Play Board | The full-screen, projector-facing page where a game is actually run |

---

## Business Rules

- A game's questions are copied (not referenced) from its bank at creation time — editing or
  deleting the source bank afterward must never change an existing game. This is enforced in
  `AppContext` / `GameSetupPage` and must be preserved in any future change.
- A tile can only be played once per game; replaying requires "Reset," which clears `answered` and
  zeroes every player's score for that game.
- AI-generated questions are not distinguished from manually-typed ones once added to a bank — there
  is no `source` field (`manual` vs. `llm`) tracking provenance, unlike the reference repo's
  `questions.source` enum.

---

## Domain Constraints

- The board layout is *derived*, not stored: `lib/board.ts` groups the bank's flat `Question[]` by
  category and sorts by points every time it's computed. There is no persisted board configuration —
  if a bank has uneven category counts, the board pads short columns to keep the grid rectangular.
- Categories are matched by exact string equality. Renaming a category means typing the same new
  string on every question that should move with it — there is no rename-the-category-once operation,
  because categories aren't stored entities.
- Slide-grounded generation truncates extracted text to 80,000 characters; very long decks may lose
  later-slide content from the prompt.

---

## Common Pitfalls

- Don't confuse `points` (the only difficulty signal that's actually stored) with the AI generator's
  `difficulty` parameter (easy/medium/hard) — the latter only influences the prompt at generation
  time and disappears once the question is saved.
- Don't assume a `Game` reflects the bank's *current* state — always check whether you mean the live
  bank or a specific game's frozen snapshot.
- The `Question.id` is the only thing tracked in `Game.answered` — don't assume tile state is keyed
  by category+points; two questions could theoretically share a category/points pair (e.g. if a bank
  has duplicate point values within a category) and only the id disambiguates them.

---

## External Dependencies & Integrations

| Service | Purpose | Notes |
|---------|---------|-------|
| Anthropic API (`api.anthropic.com`) | AI question generation | Called directly from the browser — see `llm-integration.md` for the security trade-off |
| None else | — | No backend, no database, no auth provider, no Canvas |

---

## References

- [`overview.md`](overview.md) — product framing and divergence from `owl-jeopardy-pilot`
- [`features.md`](features.md) — full feature list with what's explicitly out of scope
- [`architecture-planning.md`](architecture-planning.md) — folder structure and data models
- [`llm-integration.md`](llm-integration.md) — Wei's AI pipeline design and known gaps
