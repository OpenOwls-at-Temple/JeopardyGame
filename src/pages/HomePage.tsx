import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function HomePage() {
  const { banks, games } = useApp()

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>🦉 Welcome to Owl Jeopardy</h1>
          <p>Build question banks, then run a Jeopardy-style review game in class.</p>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>📚 Question Banks</h3>
          <p className="muted">
            Create and organize categories, questions, answers, and point values for your
            review sessions.
          </p>
          <p className="meta">
            {banks.length} bank{banks.length === 1 ? '' : 's'} saved
          </p>
          <div className="actions">
            <Link to="/banks" className="btn">
              Manage Banks
            </Link>
          </div>
        </div>

        <div className="card">
          <h3>🎮 Games</h3>
          <p className="muted">
            Turn a question bank into a live game board. Track team scores and reveal answers
            as you go.
          </p>
          <p className="meta">
            {games.length} game{games.length === 1 ? '' : 's'} saved
          </p>
          <div className="actions">
            <Link to="/games" className="btn">
              Play / Manage Games
            </Link>
            <Link to="/games/new" className="btn secondary">
              New Game
            </Link>
          </div>
        </div>
      </div>

      <div className="empty" style={{ textAlign: 'left' }}>
        <h3>How it works</h3>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.9 }}>
          <li>
            Go to <strong>Question Banks</strong> and add questions grouped into categories with
            point values.
          </li>
          <li>
            Create a <strong>Game</strong> from a bank and add your players or teams.
          </li>
          <li>
            Open the game board, pick a tile, read the question aloud, reveal the answer, and award
            points.
          </li>
        </ol>
      </div>
    </div>
  )
}
