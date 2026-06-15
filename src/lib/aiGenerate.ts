import type { Question } from '../types'
import { generateId } from './storage'

export interface GenerateOptions {
  topic: string
  categories: string[]
  pointValues: number[]
  apiKey: string
}

const SYSTEM_PROMPT = `You are a Jeopardy question writer for classroom review games.
When given a topic and categories, produce valid Jeopardy-style clues where the
"question" field is the clue shown to players and the "answer" field is the
expected response. Keep clues clear and educationally appropriate.
Always respond with valid JSON only — no markdown fences, no extra text.`

export async function generateQuestions(opts: GenerateOptions): Promise<Question[]> {
  const { topic, categories, pointValues, apiKey } = opts

  const userPrompt = `Generate Jeopardy questions for a classroom review game.
Topic: "${topic}"
Categories: ${JSON.stringify(categories)}
Point values to use (one question per value per category): ${JSON.stringify(pointValues)}

Return a JSON array of objects with this shape:
{ "category": string, "question": string, "answer": string, "points": number }

Rules:
- Create one question per (category × point value) combination.
- Higher point values should be harder questions.
- The "question" field is the clue players see (not phrased as a question).
- The "answer" field is the expected answer.
- Stay on the topic: "${topic}".`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message ?? response.statusText
    throw new Error(`Claude API error: ${msg}`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>
  }
  const text = data.content.find((c) => c.type === 'text')?.text ?? ''

  let parsed: Array<{ category: string; question: string; answer: string; points: number }>
  try {
    parsed = JSON.parse(text)
  } catch {
    // strip accidental markdown fences
    const clean = text.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(clean)
  }

  if (!Array.isArray(parsed)) throw new Error('Unexpected response shape from Claude')

  return parsed.map((q) => ({
    id: generateId(),
    category: String(q.category ?? 'General').trim() || 'General',
    question: String(q.question ?? '').trim(),
    answer: String(q.answer ?? '').trim(),
    points: Number(q.points) || 100,
  }))
}
