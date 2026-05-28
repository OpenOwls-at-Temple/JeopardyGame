import type { Question } from '../types'

// Helpers for turning a flat list of questions into a Jeopardy-style board.

export interface BoardColumn {
  category: string
  // questions in this category, sorted by ascending point value
  questions: Question[]
}

/** Unique category names in order of first appearance. */
export function deriveCategories(questions: Question[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const q of questions) {
    const cat = q.category.trim() || 'Uncategorized'
    if (!seen.has(cat)) {
      seen.add(cat)
      order.push(cat)
    }
  }
  return order
}

/** Group questions into one column per category, each sorted by points. */
export function buildBoard(questions: Question[]): BoardColumn[] {
  const categories = deriveCategories(questions)
  return categories.map((category) => ({
    category,
    questions: questions
      .filter((q) => (q.category.trim() || 'Uncategorized') === category)
      .sort((a, b) => a.points - b.points),
  }))
}
