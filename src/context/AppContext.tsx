import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Game, QuestionBank } from '../types'
import { generateId, storage } from '../lib/storage'
import { createSampleBank } from '../lib/sampleData'

interface AppContextValue {
  banks: QuestionBank[]
  games: Game[]

  // Question banks
  getBank: (id: string) => QuestionBank | undefined
  createBank: (name: string, description: string) => QuestionBank
  updateBank: (bank: QuestionBank) => void
  deleteBank: (id: string) => void

  // Games
  getGame: (id: string) => Game | undefined
  createGame: (game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => Game
  updateGame: (game: Game) => void
  deleteGame: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [banks, setBanks] = useState<QuestionBank[]>(() => {
    const existing = storage.loadBanks()
    if (existing.length > 0) return existing
    // Seed a sample bank on first run so the board is not empty.
    const seeded = [createSampleBank()]
    storage.saveBanks(seeded)
    return seeded
  })
  const [games, setGames] = useState<Game[]>(() => storage.loadGames())

  // Persist whenever state changes.
  useEffect(() => {
    storage.saveBanks(banks)
  }, [banks])
  useEffect(() => {
    storage.saveGames(games)
  }, [games])

  const getBank = useCallback(
    (id: string) => banks.find((b) => b.id === id),
    [banks],
  )

  const createBank = useCallback((name: string, description: string) => {
    const now = Date.now()
    const bank: QuestionBank = {
      id: generateId(),
      name: name.trim() || 'Untitled bank',
      description: description.trim(),
      questions: [],
      createdAt: now,
      updatedAt: now,
    }
    setBanks((prev) => [...prev, bank])
    return bank
  }, [])

  const updateBank = useCallback((bank: QuestionBank) => {
    setBanks((prev) =>
      prev.map((b) => (b.id === bank.id ? { ...bank, updatedAt: Date.now() } : b)),
    )
  }, [])

  const deleteBank = useCallback((id: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const getGame = useCallback(
    (id: string) => games.find((g) => g.id === id),
    [games],
  )

  const createGame = useCallback(
    (game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const full: Game = { ...game, id: generateId(), createdAt: now, updatedAt: now }
      setGames((prev) => [...prev, full])
      return full
    },
    [],
  )

  const updateGame = useCallback((game: Game) => {
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...game, updatedAt: Date.now() } : g)),
    )
  }, [])

  const deleteGame = useCallback((id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      banks,
      games,
      getBank,
      createBank,
      updateBank,
      deleteBank,
      getGame,
      createGame,
      updateGame,
      deleteGame,
    }),
    [banks, games, getBank, createBank, updateBank, deleteBank, getGame, createGame, updateGame, deleteGame],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within an AppProvider')
  return ctx
}
