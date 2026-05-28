import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { deriveCategories } from '../lib/board'
import Modal from '../components/Modal'

export default function BanksPage() {
  const { banks, createBank, deleteBank } = useApp()
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = () => {
    const bank = createBank(name, description)
    setShowNew(false)
    setName('')
    setDescription('')
    navigate(`/banks/${bank.id}`)
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Question Banks</h1>
          <p>Create reusable sets of categories and questions for your games.</p>
        </div>
        <button className="btn" onClick={() => setShowNew(true)}>
          + New Bank
        </button>
      </div>

      {banks.length === 0 ? (
        <div className="empty">
          <h3>No question banks yet</h3>
          <p>Create your first bank to start adding questions.</p>
          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => setShowNew(true)}>
              + New Bank
            </button>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {banks.map((bank) => {
            const categories = deriveCategories(bank.questions)
            return (
              <div className="card" key={bank.id}>
                <h3>{bank.name}</h3>
                {bank.description && <p className="muted">{bank.description}</p>}
                <p className="meta">
                  {bank.questions.length} question{bank.questions.length === 1 ? '' : 's'} ·{' '}
                  {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
                </p>
                <div className="actions">
                  <Link to={`/banks/${bank.id}`} className="btn small">
                    Edit
                  </Link>
                  <Link to="/games/new" state={{ bankId: bank.id }} className="btn small secondary">
                    Make Game
                  </Link>
                  <button
                    className="btn small danger"
                    onClick={() => {
                      if (confirm(`Delete bank "${bank.name}"? This cannot be undone.`)) {
                        deleteBank(bank.id)
                      }
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

      {showNew && (
        <Modal title="New Question Bank" onClose={() => setShowNew(false)}>
          <div className="field">
            <label htmlFor="bank-name">Name</label>
            <input
              id="bank-name"
              value={name}
              autoFocus
              placeholder="e.g. Chapter 5 Review"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="bank-desc">Description (optional)</label>
            <textarea
              id="bank-desc"
              value={description}
              placeholder="What is this bank for?"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setShowNew(false)}>
              Cancel
            </button>
            <button className="btn" onClick={handleCreate} disabled={!name.trim()}>
              Create
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
