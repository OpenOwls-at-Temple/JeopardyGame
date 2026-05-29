import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import GameBoard from '../components/GameBoard'
import Scoreboard from '../components/Scoreboard'
import QuestionModal from '../components/QuestionModal'
import type { Question } from '../types'

export default function GamePlayPage() {
  const { gameId } = useParams()
  const { getGame, updateGame } = useApp()
  const game = gameId ? getGame(gameId) : undefined

  const [active, setActive] = useState<Question | null>(null)

  if (!game) {
    return (
      <main className="app-main">
        <div className="empty">
          <h3>Game not found</h3>
          <p>It may have been deleted.</p>
          <div style={{ marginTop: 16 }}>
            <Link to="/games" className="btn">
              Back to Games
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const awardPoints = (playerId: string, delta: number) => {
    updateGame({
      ...game,
      players: game.players.map((p) =>
        p.id === playerId ? { ...p, score: p.score + delta } : p,
      ),
    })
  }

  const closeQuestion = () => {
    if (active && !game.answered.includes(active.id)) {
      updateGame({ ...game, answered: [...game.answered, active.id] })
    }
    setActive(null)
  }

  const resetBoard = () => {
    if (confirm('Reset the board and all scores for this game?')) {
      updateGame({
        ...game,
        answered: [],
        players: game.players.map((p) => ({ ...p, score: 0 })),
      })
    }
  }

  // The active question's live data (in case the modal needs current scores).
  const total = game.questions.length
  const done = game.answered.length
  const allDone = total > 0 && done === total

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="app-header">
        <Link to="/games" className="app-brand">
          <span className="logo">🦉</span>
          <span>{game.name}</span>
        </Link>
        <div className="inline-list">
          <span style={{ color: '#cbd5e1', fontSize: 14 }}>
            {done} / {total} answered
          </span>
          <button className="btn secondary small" onClick={resetBoard}>
            Reset
          </button>
          <Link to="/games" className="btn ghost small" style={{ color: '#cbd5e1' }}>
            Exit
          </Link>
        </div>
      </header>

      <main className="app-main" style={{ paddingTop: 24 }}>
        <Scoreboard players={game.players} onAdjust={awardPoints} />

        {allDone && (
          <div
            className="progress-note"
            style={{ color: 'var(--gold-text)', marginBottom: 12, fontWeight: 600 }}
          >
            🎉 All questions answered! Reset the board to play again.
          </div>
        )}

        <GameBoard
          questions={game.questions}
          answered={game.answered}
          onSelect={setActive}
        />
      </main>

      {active && (
        <QuestionModal
          question={active}
          players={game.players}
          onAward={awardPoints}
          onClose={closeQuestion}
        />
      )}
    </div>
  )
}
