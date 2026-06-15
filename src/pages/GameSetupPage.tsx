import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { generateId } from '../lib/storage'
import { deriveCategories } from '../lib/board'
import type { Player } from '../types'

interface LocationState {
  bankId?: string
}

export default function GameSetupPage() {
  const { banks, createGame } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const presetBankId = (location.state as LocationState | null)?.bankId

  const [bankId, setBankId] = useState(presetBankId ?? banks[0]?.id ?? '')
  const [gameName, setGameName] = useState('')
  const [players, setPlayers] = useState<Player[]>([
    { id: generateId(), name: 'Team 1', score: 0 },
    { id: generateId(), name: 'Team 2', score: 0 },
  ])
  const [newPlayer, setNewPlayer] = useState('')

  const selectedBank = banks.find((b) => b.id === bankId)
  const categories = selectedBank ? deriveCategories(selectedBank.questions) : []

  const addPlayer = () => {
    const name = newPlayer.trim()
    if (!name) return
    setPlayers((prev) => [...prev, { id: generateId(), name, score: 0 }])
    setNewPlayer('')
  }

  const removePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  const startGame = () => {
    if (!selectedBank) return
    const game = createGame({
      name: gameName.trim() || `${selectedBank.name} Game`,
      bankId: selectedBank.id,
      bankName: selectedBank.name,
      // snapshot the questions so later bank edits don't disturb this game
      questions: selectedBank.questions.map((q) => ({ ...q })),
      players,
      answered: [],
    })
    navigate(`/play/${game.id}`)
  }

  if (banks.length === 0) {
    return (
      <div className="empty">
        <h3>You need a question bank first</h3>
        <p>Create a bank with some questions, then come back to start a game.</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/banks" className="btn">
            Go to Question Banks
          </Link>
        </div>
      </div>
    )
  }

  const canStart = !!selectedBank && selectedBank.questions.length > 0 && players.length > 0

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/games">Games</Link> / New Game
      </div>
      <div className="page-head">
        <div>
          <h1>New Game</h1>
          <p>Pick a question bank and add your players or teams.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 620 }}>
        <div className="field">
          <label>Question Bank</label>
          <select value={bankId} onChange={(e) => setBankId(e.target.value)}>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.questions.length} questions)
              </option>
            ))}
          </select>
          {selectedBank && (
            <p className="muted" style={{ marginTop: 6 }}>
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}:{' '}
              {categories.join(', ') || '—'}
            </p>
          )}
        </div>

        {selectedBank && selectedBank.questions.length === 0 && (
          <p style={{ color: 'var(--danger)' }}>
            This bank has no questions.{' '}
            <Link to={`/banks/${selectedBank.id}`} style={{ textDecoration: 'underline' }}>
              Add some first.
            </Link>
          </p>
        )}

        <div className="field">
          <label>Game Name</label>
          <input
            value={gameName}
            placeholder={selectedBank ? `${selectedBank.name} Game` : 'My review game'}
            onChange={(e) => setGameName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Players / Teams</label>
          <div className="inline-list" style={{ marginBottom: 10 }}>
            {players.map((p) => (
              <span className="chip" key={p.id}>
                {p.name}
                <button title="Remove" onClick={() => removePlayer(p.id)}>
                  ×
                </button>
              </span>
            ))}
            {players.length === 0 && <span className="muted">No players added yet.</span>}
          </div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <input
              value={newPlayer}
              placeholder="Add a player or team name"
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPlayer()
                }
              }}
            />
            <button
              className="btn secondary"
              style={{ flex: '0 0 auto' }}
              onClick={addPlayer}
            >
              Add
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <Link to="/games" className="btn ghost">
            Cancel
          </Link>
          <button className="btn" onClick={startGame} disabled={!canStart}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  )
}
