import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function GamesPage() {
  const { games, deleteGame } = useApp()

  const sorted = [...games].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Games</h1>
          <p>Saved games keep their scores and progress. Load one to keep playing.</p>
        </div>
        <Link to="/games/new" className="btn">
          + New Game
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <h3>No games yet</h3>
          <p>Create a game from one of your question banks.</p>
          <div style={{ marginTop: 16 }}>
            <Link to="/games/new" className="btn">
              + New Game
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {sorted.map((game) => {
            const total = game.questions.length
            const done = game.answered.length
            return (
              <div className="card" key={game.id}>
                <h3>{game.name}</h3>
                <p className="muted">From: {game.bankName}</p>
                <p className="muted">
                  Players: {game.players.map((p) => p.name).join(', ') || '—'}
                </p>
                <p className="meta">
                  {done} / {total} answered · updated{' '}
                  {new Date(game.updatedAt).toLocaleDateString()}
                </p>
                <div className="actions">
                  <Link to={`/play/${game.id}`} className="btn small">
                    {done > 0 ? 'Resume' : 'Play'}
                  </Link>
                  <button
                    className="btn small danger"
                    onClick={() => {
                      if (confirm(`Delete game "${game.name}"?`)) deleteGame(game.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
