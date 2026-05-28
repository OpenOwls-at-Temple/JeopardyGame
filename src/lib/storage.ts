import type { Game, QuestionBank } from '../types'

// Simple local persistence layer backed by the browser's localStorage.
// Everything in Phase 1 lives entirely on the user's machine - no server,
// no Canvas, no LLM.

const BANKS_KEY = 'owl_jeopardy.banks'
const GAMES_KEY = 'owl_jeopardy.games'

export function generateId(): string {
  // crypto.randomUUID is available in all modern browsers; fall back just in case.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`Failed to read "${key}" from localStorage`, err)
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Failed to write "${key}" to localStorage`, err)
  }
}

export const storage = {
  loadBanks: (): QuestionBank[] => read<QuestionBank[]>(BANKS_KEY, []),
  saveBanks: (banks: QuestionBank[]): void => write(BANKS_KEY, banks),
  loadGames: (): Game[] => read<Game[]>(GAMES_KEY, []),
  saveGames: (games: Game[]): void => write(GAMES_KEY, games),
}
