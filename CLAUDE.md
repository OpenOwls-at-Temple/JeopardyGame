# CLAUDE.md
> This project follows the **OpenOwls SDD (Spec-Driven Development) Process**.
> Read the files below in order before doing any work.

## Session Startup — Read These First

1. **`progress.md`** (project root) — catch up on what has been done, what is in progress, and what is blocked
2. **`ai_specs/overview.md`** — understand the project goals, stakeholders, tech stack, and how this repo relates to `owl-jeopardy-pilot`
3. **`ai_specs/features.md`** — understand the full feature scope, what's done, and what's explicitly out of scope
4. **`ai_specs/architecture-planning.md`** — understand folder structure, design decisions, and data models
5. **`ai_specs/domain-knowledge.md`** — understand domain-specific concepts and constraints
6. **`ai_specs/llm-integration.md`** — understand the LLM's role, prompt design, and the known client-side-API-key gap
7. **`ai_specs/conventions.md`** — follow all coding conventions and workflow standards without exception
8. **`ai_specs/deployment.md`** — understand local setup; there is no deployed environment yet

## General Instructions

- Always work within the current scope defined in `ai_specs/features.md`. Do not implement
  out-of-scope items (auth, backend, sharing, etc.) unless explicitly instructed — those are flagged
  as open scope decisions, not silent TODOs.
- After completing any meaningful unit of work, update `progress.md` to reflect what was done.
- If you encounter a conflict between these spec files, flag it to the user before proceeding.
- If a spec file is missing a detail you need, ask the user rather than assuming.
- Never delete or overwrite any file in `ai_specs/` without explicit instruction.
- `npm run build` (`tsc -b && vite build`) is the project's correctness gate — it runs TypeScript in
  strict mode and fails on type or unused-symbol errors. There is no separate lint/test step yet.
