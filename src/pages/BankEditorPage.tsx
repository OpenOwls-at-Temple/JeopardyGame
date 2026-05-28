import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { generateId } from '../lib/storage'
import { deriveCategories } from '../lib/board'
import Modal from '../components/Modal'
import type { Question } from '../types'

type Draft = Omit<Question, 'id'> & { id?: string }

const emptyDraft = (category = ''): Draft => ({
  category,
  question: '',
  answer: '',
  points: 100,
})

export default function BankEditorPage() {
  const { bankId } = useParams()
  const navigate = useNavigate()
  const { getBank, updateBank } = useApp()
  const bank = bankId ? getBank(bankId) : undefined

  const [editingMeta, setEditingMeta] = useState(false)
  const [metaName, setMetaName] = useState(bank?.name ?? '')
  const [metaDesc, setMetaDesc] = useState(bank?.description ?? '')

  const [draft, setDraft] = useState<Draft | null>(null)

  const categories = useMemo(
    () => (bank ? deriveCategories(bank.questions) : []),
    [bank],
  )

  if (!bank) {
    return (
      <div className="empty">
        <h3>Bank not found</h3>
        <p>It may have been deleted.</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/banks" className="btn">
            Back to Banks
          </Link>
        </div>
      </div>
    )
  }

  const saveMeta = () => {
    updateBank({ ...bank, name: metaName.trim() || bank.name, description: metaDesc.trim() })
    setEditingMeta(false)
  }

  const saveDraft = () => {
    if (!draft) return
    const cleaned: Question = {
      id: draft.id ?? generateId(),
      category: draft.category.trim() || 'Uncategorized',
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      points: Number(draft.points) || 0,
    }
    const exists = bank.questions.some((q) => q.id === cleaned.id)
    const questions = exists
      ? bank.questions.map((q) => (q.id === cleaned.id ? cleaned : q))
      : [...bank.questions, cleaned]
    updateBank({ ...bank, questions })
    setDraft(null)
  }

  const deleteQuestion = (id: string) => {
    updateBank({ ...bank, questions: bank.questions.filter((q) => q.id !== id) })
  }

  // group for display
  const grouped = categories.map((cat) => ({
    category: cat,
    items: bank.questions
      .filter((q) => (q.category.trim() || 'Uncategorized') === cat)
      .sort((a, b) => a.points - b.points),
  }))

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/banks">Question Banks</Link> / {bank.name}
      </div>

      <div className="page-head">
        <div>
          <h1>{bank.name}</h1>
          {bank.description && <p>{bank.description}</p>}
          <p className="meta" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {bank.questions.length} question{bank.questions.length === 1 ? '' : 's'} ·{' '}
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="inline-list">
          <button
            className="btn secondary"
            onClick={() => {
              setMetaName(bank.name)
              setMetaDesc(bank.description)
              setEditingMeta(true)
            }}
          >
            Edit Details
          </button>
          <button className="btn" onClick={() => setDraft(emptyDraft(categories[0] ?? ''))}>
            + Add Question
          </button>
          <button
            className="btn success"
            disabled={bank.questions.length === 0}
            onClick={() => navigate('/games/new', { state: { bankId: bank.id } })}
          >
            Make Game
          </button>
        </div>
      </div>

      {bank.questions.length === 0 ? (
        <div className="empty">
          <h3>No questions yet</h3>
          <p>Add your first question to build out this bank.</p>
          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => setDraft(emptyDraft())}>
              + Add Question
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          {grouped.map((group) => (
            <div key={group.category}>
              <h3 style={{ marginBottom: 8 }}>
                {group.category}{' '}
                <span className="tag">{group.items.length}</span>
              </h3>
              <table className="q-table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Points</th>
                    <th>Question</th>
                    <th>Answer</th>
                    <th style={{ width: 130 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((q) => (
                    <tr key={q.id}>
                      <td className="points-cell">{q.points}</td>
                      <td>{q.question}</td>
                      <td>{q.answer}</td>
                      <td>
                        <div className="inline-list">
                          <button
                            className="btn small secondary"
                            onClick={() => setDraft({ ...q })}
                          >
                            Edit
                          </button>
                          <button
                            className="btn small danger"
                            onClick={() => deleteQuestion(q.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Edit bank details */}
      {editingMeta && (
        <Modal title="Edit Bank Details" onClose={() => setEditingMeta(false)}>
          <div className="field">
            <label>Name</label>
            <input value={metaName} autoFocus onChange={(e) => setMetaName(e.target.value)} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setEditingMeta(false)}>
              Cancel
            </button>
            <button className="btn" onClick={saveMeta}>
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* Add / edit question */}
      {draft && (
        <Modal
          title={draft.id ? 'Edit Question' : 'Add Question'}
          onClose={() => setDraft(null)}
        >
          <div className="row">
            <div className="field">
              <label>Category</label>
              <input
                list="category-list"
                value={draft.category}
                autoFocus
                placeholder="e.g. The Cell"
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
              <datalist id="category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="field" style={{ maxWidth: 140 }}>
              <label>Point Value</label>
              <input
                type="number"
                min={0}
                step={50}
                value={draft.points}
                onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="field">
            <label>Question</label>
            <textarea
              value={draft.question}
              placeholder="What will players see?"
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Answer</label>
            <textarea
              value={draft.answer}
              placeholder="The correct answer"
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={saveDraft}
              disabled={!draft.question.trim() || !draft.answer.trim()}
            >
              {draft.id ? 'Save Changes' : 'Add Question'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
