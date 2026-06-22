import type { Question } from '../types'
import { generateId } from './storage'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GenerateOptions {
  topic: string
  categories: string[]
  pointValues: number[]
  apiKey: string
  difficulty: Difficulty
  slideContext?: string  // extracted text from an uploaded PPTX/PDF
}

const SYSTEM_PROMPT = `You are a Jeopardy question writer for classroom review games.
When given a topic and categories, produce valid Jeopardy-style clues where the
"question" field is the clue shown to players and the "answer" field is the
expected response. Keep clues clear and educationally appropriate.
Always respond with valid JSON only — no markdown fences, no extra text.`

const DIFFICULTY_INSTRUCTIONS: Record<Difficulty, string> = {
  easy: `All questions should be EASY — suitable for an introductory course or first exposure to the topic.
- Ask for definitions, key vocabulary, and basic facts students would memorize.
- Every clue should have one obvious, unambiguous answer.
- Avoid edge cases, exceptions, or multi-step reasoning.
- Example style: "The process by which plants make food using sunlight." → Photosynthesis`,

  medium: `All questions should be MEDIUM difficulty — suitable for a standard course mid-term review.
- Ask about relationships between concepts, cause-and-effect, processes, and how things work.
- Clues may require combining two pieces of knowledge or applying a concept to a scenario.
- Avoid pure vocabulary recall at the low end; avoid highly specialized details at the high end.
- Example style: "The organelle that produces most of a cell's ATP through cellular respiration." → The mitochondria`,

  hard: `All questions should be HARD — suitable for an advanced course or final-exam review.
- Ask about precise mechanisms, exceptions to rules, synthesis across multiple concepts, or specific quantitative details.
- Clues should require deep understanding, not just recall or basic comprehension.
- Expect students to distinguish between closely related concepts.
- Example style: "The electron carrier that is reduced to FADH2 during the Krebs cycle." → FAD (flavin adenine dinucleotide)`,
}

function buildUserPrompt(opts: GenerateOptions, format: 'array' | 'ndjson'): string {
  const { topic, categories, pointValues, difficulty, slideContext } = opts

  const outputInstruction = format === 'ndjson'
    ? `Output each question as a separate JSON object on its own line (NDJSON).
Do not use an array wrapper. Each line must be a complete, valid JSON object.
Example:
{"category":"The Cell","question":"The powerhouse of the cell.","answer":"The mitochondria","points":100}
{"category":"The Cell","question":"The molecule that stores genetic info.","answer":"DNA","points":200}`
    : `Return a JSON array of objects with this shape:
{ "category": string, "question": string, "answer": string, "points": number }`

  return `Generate Jeopardy questions for a classroom review game.
Topic: "${topic}"
Categories: ${JSON.stringify(categories)}
Point values to use (one question per value per category): ${JSON.stringify(pointValues)}
Overall difficulty level: ${difficulty.toUpperCase()}

${DIFFICULTY_INSTRUCTIONS[difficulty]}

Within the ${difficulty} level, still scale relative difficulty by point value:
lower point values should be the easier ${difficulty} questions, higher point values the harder ${difficulty} questions.

${outputInstruction}

Rules:
- Create one question per (category × point value) combination.
- The "question" field is the clue players see (not phrased as a question).
- The "answer" field is the expected answer.
- Stay on the topic: "${topic}".${slideContext ? `

The following is the source material from uploaded lecture slides.
Only generate questions about content that appears in this material.
Use specific facts, terms, and concepts from the slides rather than general knowledge.
---
${slideContext.slice(0, 80000)}
---` : ''}`
}

function shapeQuestion(raw: { category?: unknown; question?: unknown; answer?: unknown; points?: unknown }): Question {
  return {
    id: generateId(),
    category: String(raw.category ?? 'General').trim() || 'General',
    question: String(raw.question ?? '').trim(),
    answer: String(raw.answer ?? '').trim(),
    points: Number(raw.points) || 100,
  }
}

// Non-streaming: waits for the full response, returns Question[].
export async function generateQuestions(opts: GenerateOptions): Promise<Question[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(opts, 'array') }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message ?? response.statusText
    throw new Error(`Claude API error: ${msg}`)
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> }
  const text = data.content.find((c) => c.type === 'text')?.text ?? ''

  let parsed: Array<{ category: string; question: string; answer: string; points: number }>
  try {
    parsed = JSON.parse(text)
  } catch {
    const clean = text.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(clean)
  }

  if (!Array.isArray(parsed)) throw new Error('Unexpected response shape from Claude')
  return parsed.map(shapeQuestion)
}

// Streaming: calls onQuestion for each question as it arrives via SSE + NDJSON.
// Returns a promise that resolves when the stream is complete.
export async function generateQuestionsStream(
  opts: GenerateOptions,
  onQuestion: (q: Question) => void,
): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(opts, 'ndjson') }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message ?? response.statusText
    throw new Error(`Claude API error: ${msg}`)
  }

  if (!response.body) throw new Error('Claude API returned no response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let sseBuf = ''
  let textAccum = ''

  const tryParseLine = (line: string) => {
    const trimmed = line.trim()
    // Skip empty lines and JSON array wrapper characters Claude occasionally emits
    if (!trimmed || trimmed === '[' || trimmed === ']') return
    // Strip trailing comma in case Claude outputs array-style NDJSON
    const clean = trimmed.replace(/,$/, '')
    try {
      const q = JSON.parse(clean)
      if (q && typeof q === 'object' && q.question) onQuestion(shapeQuestion(q))
    } catch {
      // incomplete fragment — more text is still arriving
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    sseBuf += decoder.decode(value, { stream: true })
    const sseLines = sseBuf.split('\n')
    sseBuf = sseLines.pop() ?? ''

    for (const sseLine of sseLines) {
      if (!sseLine.startsWith('data: ')) continue
      const payload = sseLine.slice(6).trim()
      if (payload === '[DONE]') continue

      let event: { type?: string; delta?: { type?: string; text?: string } }
      try { event = JSON.parse(payload) } catch { continue }

      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        textAccum += event.delta.text ?? ''

        // Fire onQuestion for each complete newline-terminated JSON object.
        let newlineIdx: number
        while ((newlineIdx = textAccum.indexOf('\n')) !== -1) {
          const completeLine = textAccum.slice(0, newlineIdx)
          textAccum = textAccum.slice(newlineIdx + 1)
          tryParseLine(completeLine)
        }
      }
    }
  }

  // Flush anything remaining (last line with no trailing newline)
  if (textAccum.trim()) tryParseLine(textAccum)
}
