import type { Question } from '../types'
import type { Difficulty } from './aiGenerate'

const STORAGE_KEY = 'owl_jeopardy.ai_cache'
const MAX_ENTRIES = 10

interface CacheEntry {
  key: string
  questions: Question[]
  topic: string
  difficulty: Difficulty
  savedAt: number
}

function load(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CacheEntry[]) : []
  } catch {
    return []
  }
}

function save(entries: CacheEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function buildCacheKey(
  topic: string,
  categories: string[],
  pointValues: number[],
  difficulty: Difficulty,
): string {
  const cats = [...categories].sort().join('|')
  const pts = [...pointValues].sort((a, b) => a - b).join(',')
  return `${topic.trim().toLowerCase()}::${cats}::${pts}::${difficulty}`
}

export function cacheGet(key: string): Question[] | null {
  const entries = load()
  const hit = entries.find((e) => e.key === key)
  return hit ? hit.questions : null
}

export function cachePut(
  key: string,
  questions: Question[],
  topic: string,
  difficulty: Difficulty,
): void {
  const entries = load().filter((e) => e.key !== key) // remove existing entry with same key
  entries.unshift({ key, questions, topic, difficulty, savedAt: Date.now() })
  save(entries.slice(0, MAX_ENTRIES)) // keep only the most recent MAX_ENTRIES
}

export function cacheList(): CacheEntry[] {
  return load()
}

export function cacheDelete(key: string): void {
  save(load().filter((e) => e.key !== key))
}
