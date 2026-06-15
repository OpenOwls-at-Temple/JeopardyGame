import type { Player } from '../types'

interface ScoreboardProps {
  players: Player[]
  onAdjust: (playerId: string, delta: number) => void
}

export default function Scoreboard({ players, onAdjust }: ScoreboardProps) {
  const topScore = Math.max(0, ...players.map((p) => p.score))

  return (
    <div className="scoreboard">
      {players.map((p) => {
        const isLeader = p.score === topScore && topScore > 0
        return (
          <div className={`score-card ${isLeader ? 'leader' : ''}`} key={p.id}>
            <div className="name">
              {isLeader && <span className="crown">👑</span>}
              {p.name}
            </div>
            <div className="score">{p.score}</div>
            <div className="inline-list" style={{ justifyContent: 'center', marginTop: 6 }}>
              <button className="btn small ghost" onClick={() => onAdjust(p.id, -100)}>
                −100
              </button>
              <button className="btn small ghost" onClick={() => onAdjust(p.id, 100)}>
                +100
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
