import { useState } from 'react'
import Modal from './Modal'
import { generateQuestionsStream, type Difficulty } from '../lib/aiGenerate'
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
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  // streaming state
  const [streaming, setStreaming] = useState(false)
  const [streamDone, setStreamDone] = useState(false)
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
    setPreview([])       // switch to review screen immediately
    setSelected(new Set())
    setStreaming(true)
    setStreamDone(false)

    try {
      await generateQuestionsStream(
        { topic, categories, pointValues, apiKey: apiKey.trim(), difficulty },
        (q) => {
          setPreview((prev) => [...(prev ?? []), q])
          setSelected((prev) => new Set([...prev, q.id]))
        },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStreaming(false)
      setStreamDone(true)
    }
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleAdd = () => {
    if (!preview) return
    onAdd(preview.filter((q) => selected.has(q.id)))
    onClose()
  }

  const handleBack = () => {
    setPreview(null)
    setStreaming(false)
    setStreamDone(false)
    setError(null)
  }

  const difficultyLabel = difficulty === 'easy' ? '🟢 Easy' : difficulty === 'medium' ? '🟡 Medium' : '🔴 Hard'

  return (
    <Modal title="Generate Questions with AI" onClose={onClose}>
      {preview === null ? (
        /* ── Input screen ── */
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

          <div className="field">
            <label>Difficulty Level</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    border: difficulty === d ? '2px solid var(--primary)' : '2px solid var(--border)',
                    background: difficulty === d ? 'var(--primary)' : 'transparent',
                    color: difficulty === d ? '#fff' : 'var(--text)',
                    fontWeight: difficulty === d ? 600 : 400,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontSize: 14,
                  }}
                >
                  {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {difficulty === 'easy' && 'Definitions, key vocabulary, basic facts — ideal for intro courses.'}
              {difficulty === 'medium' && 'Relationships, cause & effect, how things work — standard mid-term level.'}
              {difficulty === 'hard' && 'Precise mechanisms, edge cases, synthesis across concepts — advanced level.'}
            </p>
          </div>

          {error && <p style={{ color: 'var(--danger)', margin: '0 0 8px' }}>{error}</p>}

          <div className="modal-actions">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={handleGenerate}>Generate</button>
          </div>
        </>
      ) : (
        /* ── Review screen (shown immediately, populates as stream arrives) ── */
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0 }}>
              {streaming
                ? <><span className="streaming-pulse">●</span> Generating… {preview.length} so far</>
                : streamDone
                  ? <>✓ Done — {preview.length} question{preview.length === 1 ? '' : 's'} generated</>
                  : <>Select questions to add ({selected.size} of {preview.length} selected)</>
              }
            </p>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{difficultyLabel}</span>
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}>
            {preview.length === 0 && streaming ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                Waiting for first question…
              </p>
            ) : (
              <table className="q-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th style={{ width: 70 }}>Pts</th>
                    <th style={{ width: 100 }}>Category</th>
                    <th>Question</th>
                    <th>Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((q, i) => (
                    <tr
                      key={q.id}
                      style={{
                        opacity: selected.has(q.id) ? 1 : 0.4,
                        animation: `fadeIn 0.25s ease both`,
                        animationDelay: `${Math.min(i * 30, 300)}ms`,
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(q.id)}
                          onChange={() => toggleSelect(q.id)}
                          disabled={streaming}
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
            )}
          </div>

          {error && <p style={{ color: 'var(--danger)', margin: '0 0 8px' }}>{error}</p>}

          <div className="modal-actions">
            <button className="btn ghost" onClick={handleBack} disabled={streaming}>Back</button>
            <button
              className="btn"
              onClick={handleAdd}
              disabled={streaming || selected.size === 0}
            >
              {streaming
                ? 'Generating…'
                : `Add ${selected.size} Question${selected.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
