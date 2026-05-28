import { useMemo } from 'react'
import { buildBoard } from '../lib/board'
import type { Question } from '../types'

interface GameBoardProps {
  questions: Question[]
  answered: string[]
  onSelect: (question: Question) => void
}

export default function GameBoard({ questions, answered, onSelect }: GameBoardProps) {
  const columns = useMemo(() => buildBoard(questions), [questions])
  const answeredSet = useMemo(() => new Set(answered), [answered])

  // Normalize column heights: every column gets the same number of rows so the
  // grid stays rectangular even when categories have different question counts.
  const maxRows = Math.max(0, ...columns.map((c) => c.questions.length))

  return (
    <div className="board-wrap">
      <div
        className="board"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` }}
      >
        {columns.map((col) => (
          <div className="board-col" key={col.category}>
            <div className="board-cat">{col.category}</div>
            {Array.from({ length: maxRows }).map((_, rowIdx) => {
              const q = col.questions[rowIdx]
              if (!q) {
                return <button key={rowIdx} className="tile empty-slot" disabled />
              }
              const used = answeredSet.has(q.id)
              return (
                <button
                  key={q.id}
                  className="tile"
                  disabled={used}
                  onClick={() => onSelect(q)}
                >
                  {used ? '' : q.points}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
