import { useState } from 'react'
import Modal from './Modal'
import { generateQuestions } from '../lib/aiGenerate'
import type { Question } from '../types'

const API_KEY_STORAGE = 'owl_jeopardy.anthropic_key'

const DEFAULT_POINTS = [100, 200, 300, 400, 500]

interface Props {
  existingCategories: string[]
  onAdd: (questions: Question[]) => void
  onClose: () => void
}

export default function AIGenerateModal({ existingCategories, onAdd, onClose }: Props) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? '')
  const [saveKey, setSaveKey] = useState(!!localStorage.getItem(API_KEY_STORAGE))
  const [topic, setTopic] = useState('')
  const [categoriesRaw, setCategoriesRaw] = useState(existingCategories.slice(0, 5).join(', '))
  const [pointsRaw, setPointsRaw] = useState(DEFAULT_POINTS.join(', '))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Question[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const parseList = (raw: string) =>
    raw.split(',').map((s) => s.trim()).filter(Boolean)

  const handleGenerate = async () => {
    const categories = parseList(categoriesRaw)
    const pointValues = parseList(pointsRaw).map(Number).filter((n) => !isNaN(n) && n > 0)

    if (!topic.trim()) { setError('Please enter a topic.'); return }
    if (categories.length === 0) { setError('Please enter at least one category.'); return }
    if (pointValues.length === 0) { setError('Please enter at least one point value.'); return }
    if (!apiKey.trim()) { setError('Please enter your Anthropic API key.'); return }

    if (saveKey) localStorage.setItem(API_KEY_STORAGE, apiKey.trim())
    else localStorage.removeItem(API_KEY_STORAGE)

    setError(null)
    setLoading(true)
    try {
      const questions = await generateQuestions({ topic, categories, pointValues, apiKey: apiKey.trim() })
      setPreview(questions)
      setSelected(new Set(questions.map((q) => q.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    if (!preview) return
    onAdd(preview.filter((q) => selected.has(q.id)))
    onClose()
  }

  return (
    <Modal title="Generate Questions with AI" onClose={onClose}>
      {!preview ? (
        <>
          <div className="field">
            <label>Anthropic API Key</label>
            <input
              type="password"
              value={apiKey}
              placeholder="sk-ant-..."
              onChange={(e) => setApiKey(e.target.value)}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={saveKey}
                onChange={(e) => setSaveKey(e.target.checked)}
              />
              Save key in browser (localStorage)
            </label>
          </div>

          <div className="field">
            <label>Topic / Subject</label>
            <input
              value={topic}
              autoFocus
              placeholder="e.g. World War II, Photosynthesis, Shakespeare"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Categories (comma-separated)</label>
            <input
              value={categoriesRaw}
              placeholder="e.g. Causes, Battles, Leaders"
              onChange={(e) => setCategoriesRaw(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Point Values (comma-separated)</label>
            <input
              value={pointsRaw}
              placeholder="100, 200, 300, 400, 500"
              onChange={(e) => setPointsRaw(e.target.value)}
            />
          </div>

          {error && <p style={{ color: 'var(--danger)', margin: '0 0 8px' }}>{error}</p>}

          <div className="modal-actions">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ marginBottom: 12 }}>
            Select questions to add ({selected.size} of {preview.length} selected):
          </p>
          <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}>
            <table className="q-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th style={{ width: 90 }}>Points</th>
                  <th>Category</th>
                  <th>Question</th>
                  <th>Answer</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((q) => (
                  <tr key={q.id} style={{ opacity: selected.has(q.id) ? 1 : 0.4 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(q.id)}
                        onChange={() => toggleSelect(q.id)}
                      />
                    </td>
                    <td className="points-cell">{q.points}</td>
                    <td>{q.category}</td>
                    <td>{q.question}</td>
                    <td>{q.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p style={{ color: 'var(--danger)', margin: '0 0 8px' }}>{error}</p>}

          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setPreview(null)}>Back</button>
            <button className="btn" onClick={handleAdd} disabled={selected.size === 0}>
              Add {selected.size} Question{selected.size === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
