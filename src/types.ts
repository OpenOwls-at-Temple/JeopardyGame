// Core domain types for Owl Jeopardy (Phase 1)

export interface Question {
  id: string
  category: string
  question: string
  answer: string
  points: number
}

export interface QuestionBank {
  id: string
  name: string
  description: string
  questions: Question[]
  createdAt: number
  updatedAt: number
}

export interface Player {
  id: string
  name: string
  score: number
}

export interface Game {
  id: string
  name: string
  bankId: string
  bankName: string
  // A snapshot of the questions taken when the game was created, so that
  // later edits to the source bank do not change an in-progress game.
  questions: Question[]
  players: Player[]
  // ids of questions that have already been played
  answered: string[]
  createdAt: number
  updatedAt: number
}
