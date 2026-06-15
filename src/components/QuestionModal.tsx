import { useState } from 'react'
import Modal from './Modal'
import type { Player, Question } from '../types'

interface QuestionModalProps {
  question: Question
  players: Player[]
  onAward: (playerId: string, delta: number) => void
  onClose: () => void
}

export default function QuestionModal({
  question,
  players,
  onAward,
  onClose,
}: QuestionModalProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <Modal onClose={onClose} className="question-modal">
      <div className="q-meta">
        {question.category} — <span className="q-points">{question.points} pts</span>
      </div>
      <div className="q-text">{question.question}</div>

      {!revealed ? (
        <button className="btn" onClick={() => setRevealed(true)}>
          Reveal Answer
        </button>
      ) : (
        <>
          <div className="a-text">
            <span className="label">Answer</span>
            {question.answer}
          </div>

          {players.length > 0 && (
            <div className="award-grid">
              {players.map((p) => (
                <div className="award-row" key={p.id}>
                  <span className="name">
                    {p.name} <span className="muted">({p.score})</span>
                  </span>
                  <div className="award-btns">
                    <button
                      className="btn small danger"
                      title={`Subtract ${question.points}`}
                      onClick={() => onAward(p.id, -question.points)}
                    >
                      −{question.points}
                    </button>
                    <button
                      className="btn small success"
                      title={`Award ${question.points}`}
                      onClick={() => onAward(p.id, question.points)}
                    >
                      +{question.points}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
