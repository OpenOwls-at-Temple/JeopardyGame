import type { Question } from '../types'
import { generateId } from './storage'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GenerateOptions {
  topic: string
  categories: string[]
  pointValues: number[]
  difficulty: Difficulty
  slideContext?: string
}

function shapeQuestion(raw: { category?: unknown; question?: unknown; answer?: unknown; points?: unknown }): Question {
  return {
    id: (raw as { id?: string }).id ?? generateId(),
    category: String(raw.category ?? 'General').trim() || 'General',
    question: String(raw.question ?? '').trim(),
    answer: String(raw.answer ?? '').trim(),
    points: Number(raw.points) || 100,
  }
}

// Streaming: calls onQuestion for each question as it arrives from the backend.
// The backend (FastAPI + LiteLLM) emits one complete JSON object per SSE data event.
export async function generateQuestionsStream(
  opts: GenerateOptions,
  onQuestion: (q: Question) => void,
): Promise<void> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: opts.topic,
      categories: opts.categories,
      pointValues: opts.pointValues,
      difficulty: opts.difficulty,
      slideContext: opts.slideContext,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = (err as { detail?: string }).detail ?? response.statusText
    throw new Error(`Claude API error: ${msg}`)
  }

  if (!response.body) throw new Error('Server returned no response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return
      try {
        const q = JSON.parse(payload)
        if (q.error) throw new Error(q.error)
        if (q.question) onQuestion(shapeQuestion(q))
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}

// Non-streaming convenience wrapper — collects all streamed results.
export async function generateQuestions(opts: GenerateOptions): Promise<Question[]> {
  const results: Question[] = []
  await generateQuestionsStream(opts, (q) => results.push(q))
  return results
}
