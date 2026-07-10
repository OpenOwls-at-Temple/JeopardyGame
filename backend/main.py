"""
Owl Jeopardy — FastAPI backend
Feature 6: server-side LLM proxy via LiteLLM
"""

import os
import json
import uuid
import datetime
from typing import Optional, AsyncIterator

import litellm
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ── Prompts (ported from src/lib/aiGenerate.ts) ───────────────────────────────

SYSTEM_PROMPT = (
    "You are a Jeopardy question writer for classroom review games.\n"
    "When given a topic and categories, produce valid Jeopardy-style clues where the\n"
    '"question" field is the clue shown to players and the "answer" field is the\n'
    "expected response. Keep clues clear and educationally appropriate.\n"
    "Always respond with valid JSON only — no markdown fences, no extra text."
)

DIFFICULTY_INSTRUCTIONS: dict[str, str] = {
    "easy": (
        "All questions should be EASY — suitable for an introductory course or first exposure to the topic.\n"
        "- Ask for definitions, key vocabulary, and basic facts students would memorize.\n"
        "- Every clue should have one obvious, unambiguous answer.\n"
        "- Avoid edge cases, exceptions, or multi-step reasoning.\n"
        '- Example style: "The process by which plants make food using sunlight." → Photosynthesis'
    ),
    "medium": (
        "All questions should be MEDIUM difficulty — suitable for a standard course mid-term review.\n"
        "- Ask about relationships between concepts, cause-and-effect, processes, and how things work.\n"
        "- Clues may require combining two pieces of knowledge or applying a concept to a scenario.\n"
        "- Avoid pure vocabulary recall at the low end; avoid highly specialized details at the high end.\n"
        '- Example style: "The organelle that produces most of a cell\'s ATP through cellular respiration." → The mitochondria'
    ),
    "hard": (
        "All questions should be HARD — suitable for an advanced course or final-exam review.\n"
        "- Ask about precise mechanisms, exceptions to rules, synthesis across multiple concepts, or specific quantitative details.\n"
        "- Clues should require deep understanding, not just recall or basic comprehension.\n"
        "- Expect students to distinguish between closely related concepts.\n"
        '- Example style: "The electron carrier that is reduced to FADH2 during the Krebs cycle." → FAD (flavin adenine dinucleotide)'
    ),
}


def build_user_prompt(
    topic: str,
    categories: list[str],
    point_values: list[int],
    difficulty: str,
    slide_context: Optional[str],
) -> str:
    output_instruction = (
        "Output each question as a separate JSON object on its own line (NDJSON).\n"
        "Do not use an array wrapper. Each line must be a complete, valid JSON object.\n"
        "Example:\n"
        '{"category":"The Cell","question":"The powerhouse of the cell.","answer":"The mitochondria","points":100}\n'
        '{"category":"The Cell","question":"The molecule that stores genetic info.","answer":"DNA","points":200}'
    )

    prompt = (
        "Generate Jeopardy questions for a classroom review game.\n"
        f'Topic: "{topic}"\n'
        f"Categories: {json.dumps(categories)}\n"
        f"Point values to use (one question per value per category): {json.dumps(point_values)}\n"
        f"Overall difficulty level: {difficulty.upper()}\n\n"
        f"{DIFFICULTY_INSTRUCTIONS[difficulty]}\n\n"
        f"Within the {difficulty} level, still scale relative difficulty by point value:\n"
        f"lower point values should be the easier {difficulty} questions, higher point values the harder {difficulty} questions.\n\n"
        f"{output_instruction}\n\n"
        "Rules:\n"
        "- Create one question per (category × point value) combination.\n"
        '- The "question" field is the clue players see (not phrased as a question).\n'
        '- The "answer" field is the expected answer.\n'
        f'- Stay on the topic: "{topic}".'
    )

    if slide_context:
        prompt += (
            "\n\nThe following is the source material from uploaded lecture slides.\n"
            "Only generate questions about content that appears in this material.\n"
            "Use specific facts, terms, and concepts from the slides rather than general knowledge.\n"
            "---\n"
            f"{slide_context[:80000]}\n"
            "---"
        )

    return prompt


# ── Supabase quota (optional — skipped if SUPABASE_URL is not set) ────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
DAILY_TOKEN_CAP = int(os.getenv("LLM_DAILY_TOKEN_CAP", "100000"))

_SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


async def get_today_usage() -> int:
    """Returns total tokens used today. Returns 0 if Supabase is not configured."""
    if not SUPABASE_URL:
        return 0
    import httpx
    today = datetime.date.today().isoformat()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/llm_usage",
            headers=_SB_HEADERS,
            params={"select": "tokens_input,tokens_output", "date": f"eq.{today}"},
        )
    rows = r.json() if r.status_code == 200 else []
    return sum(row.get("tokens_input", 0) + row.get("tokens_output", 0) for row in rows)


async def log_usage(tokens_input: int, tokens_output: int) -> None:
    """Inserts one usage record for today. No-op if Supabase is not configured."""
    if not SUPABASE_URL or not (tokens_input or tokens_output):
        return
    import httpx
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{SUPABASE_URL}/rest/v1/llm_usage",
            headers=_SB_HEADERS,
            json={
                "date": datetime.date.today().isoformat(),
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
            },
        )


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Owl Jeopardy API")

_origins = ["http://localhost:5173", "http://localhost:4173"]
if _frontend := os.getenv("FRONTEND_URL", ""):
    _origins.append(_frontend)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class GenerateRequest(BaseModel):
    topic: str
    categories: list[str]
    pointValues: list[int]
    difficulty: str
    slideContext: Optional[str] = None


async def _stream(req: GenerateRequest) -> AsyncIterator[str]:
    model = os.environ.get("LLM_MODEL", "deepseek/deepseek-chat")
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(
            req.topic, req.categories, req.pointValues,
            req.difficulty, req.slideContext,
        )},
    ]

    tokens_input = 0
    tokens_output = 0
    text_accum = ""

    try:
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=4096,
        )

        async for chunk in response:
            # Capture usage metadata when available (not all providers include it per-chunk)
            if hasattr(chunk, "usage") and chunk.usage:
                tokens_input = getattr(chunk.usage, "prompt_tokens", 0) or 0
                tokens_output = getattr(chunk.usage, "completion_tokens", 0) or 0

            delta = (chunk.choices[0].delta.content or "") if chunk.choices else ""
            if not delta:
                continue

            text_accum += delta

            # Emit each complete NDJSON line as a standalone SSE event
            while "\n" in text_accum:
                line, text_accum = text_accum.split("\n", 1)
                line = line.strip().rstrip(",")
                if not line or line in ("[", "]"):
                    continue
                try:
                    q = json.loads(line)
                    if q.get("question"):
                        q.setdefault("id", str(uuid.uuid4()))
                        yield f"data: {json.dumps(q)}\n\n"
                except json.JSONDecodeError:
                    pass  # incomplete fragment — more text arriving

        # Flush any remainder without a trailing newline
        line = text_accum.strip().rstrip(",")
        if line and line not in ("[", "]"):
            try:
                q = json.loads(line)
                if q.get("question"):
                    q.setdefault("id", str(uuid.uuid4()))
                    yield f"data: {json.dumps(q)}\n\n"
            except json.JSONDecodeError:
                pass

    except Exception as exc:
        yield f'data: {{"error":"Generation failed: {str(exc)}"}}\n\n'

    finally:
        yield "data: [DONE]\n\n"
        await log_usage(tokens_input, tokens_output)


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    if req.difficulty not in DIFFICULTY_INSTRUCTIONS:
        raise HTTPException(status_code=422, detail="difficulty must be easy, medium, or hard")

    used = await get_today_usage()
    if used >= DAILY_TOKEN_CAP:
        raise HTTPException(
            status_code=429,
            detail=f"Daily token quota of {DAILY_TOKEN_CAP:,} tokens reached — try again tomorrow",
        )

    return StreamingResponse(
        _stream(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": os.getenv("LLM_MODEL", "not configured"),
        "quota_configured": bool(SUPABASE_URL),
        "daily_token_cap": DAILY_TOKEN_CAP,
    }
