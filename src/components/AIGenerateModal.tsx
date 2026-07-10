import { useRef, useState } from 'react'
import Modal from './Modal'
import { generateQuestionsStream, type Difficulty } from '../lib/aiGenerate'
import { parseSlideFile, fileNameToTopic, type ParseResult } from '../lib/slideParser'
import { buildCacheKey, cacheGet, cachePut } from '../lib/aiCache'
import type { Question } from '../types'

const DEFAULT_POINTS = [100, 200, 300, 400, 500]

interface Props {
  existingCategories: string[]
  onAdd: (questions: Question[]) => void
  onClose: () => void
}

export default function AIGenerateModal({ existingCategories, onAdd, onClose }: Props) {
  const [topic, setTopic] = useState('')
  const [categoriesRaw, setCategoriesRaw] = useState(existingCategories.slice(0, 5).join(', '))
  const [pointsRaw, setPointsRaw] = useState(DEFAULT_POINTS.join(', '))
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  // slide upload state
  const [slideResult, setSlideResult] = useState<ParseResult | null>(null)
  const [slideLoading, setSlideLoading] = useState(false)
  const [slideError, setSlideError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // streaming + cache state
  const [streaming, setStreaming] = useState(false)
  const [streamDone, setStreamDone] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Question[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const parseList = (raw: string) =>
    raw.split(',').map((s) => s.trim()).filter(Boolean)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSlideError(null)
    setSlideLoading(true)
    setSlideResult(null)
    try {
      const result = await parseSlideFile(file)
      setSlideResult(result)
      // Auto-fill topic from filename if topic is blank
      if (!topic.trim()) setTopic(fileNameToTopic(result.fileName))
    } catch (err) {
      setSlideError(err instanceof Error ? err.message : String(err))
    } finally {
      setSlideLoading(false)
      // reset input so re-uploading the same file fires onChange again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearSlide = () => {
    setSlideResult(null)
    setSlideError(null)
  }

  const runGenerate = async (skipCache: boolean) => {
    const categories = parseList(categoriesRaw)
    const pointValues = parseList(pointsRaw).map(Number).filter((n) => !isNaN(n) && n > 0)

    if (!topic.trim()) { setError('Please enter a topic.'); return }
    if (categories.length === 0) { setError('Please enter at least one category.'); return }
    if (pointValues.length === 0) { setError('Please enter at least one point value.'); return }

    setError(null)
    setFromCache(false)

    const cacheKey = buildCacheKey(topic, categories, pointValues, difficulty)

    // Cache hit — skip the API call entirely (unless teacher clicked Regenerate)
    if (!skipCache && !slideResult) {
      const cached = cacheGet(cacheKey)
      if (cached) {
        setPreview(cached)
        setSelected(new Set(cached.map((q) => q.id)))
        setFromCache(true)
        setStreamDone(true)
        return
      }
    }

    setPreview([])
    setSelected(new Set())
    setStreaming(true)
    setStreamDone(false)

    const accumulated: Question[] = []

    try {
      await generateQuestionsStream(
        { topic, categories, pointValues, difficulty, slideContext: slideResult?.text },
        (q) => {
          accumulated.push(q)
          setPreview((prev) => [...(prev ?? []), q])
          setSelected((prev) => new Set([...prev, q.id]))
        },
      )
      // Only cache when there's no slide context — slide results are document-specific
      if (!slideResult && accumulated.length > 0) {
        cachePut(cacheKey, accumulated, topic, difficulty)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStreaming(false)
      setStreamDone(true)
    }
  }

  const handleGenerate = () => runGenerate(false)
  const handleRegenerate = () => runGenerate(true)

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleAdd = () => {
    if (!preview) return
    onAdd(
      preview.filter(
        (q) => selected.has(q.id) && q.question.trim() && q.answer.trim(),
      ),
    )
    onClose()
  }

  const handleBack = () => {
    setPreview(null)
    setStreaming(false)
    setStreamDone(false)
    setFromCache(false)
    setError(null)
  }

  const difficultyLabel = difficulty === 'easy' ? '🟢 Easy' : difficulty === 'medium' ? '🟡 Medium' : '🔴 Hard'

  return (
    <Modal title="Generate Questions with AI" onClose={onClose}>
      {preview === null ? (
        /* ── Input screen ── */
        <>
          <div className="field">
            <label>Upload Slides <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional — .pptx or .pdf)</span></label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,.pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {!slideResult ? (
              <button
                type="button"
                className="btn secondary"
                style={{ width: '100%', textAlign: 'center' }}
                disabled={slideLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {slideLoading ? 'Parsing…' : '📂 Browse for file'}
              </button>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 6,
                background: 'var(--surface-muted)', border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13 }}>
                  ✅ <strong>{slideResult.fileName}</strong>
                  {' '}<span style={{ color: 'var(--text-muted)' }}>— {slideResult.pageCount} slide{slideResult.pageCount === 1 ? '' : 's'} parsed</span>
                </span>
                <button type="button" className="btn small ghost" onClick={clearSlide}>✕</button>
              </div>
            )}
            {slideError && <p style={{ color: 'var(--danger)', fontSize: 13, margin: '4px 0 0' }}>{slideError}</p>}
          </div>

          <div className="field">
            <label>Topic / Subject {slideResult && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(auto-filled from file)</span>}</label>
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
                : fromCache
                  ? <>⚡ Loaded from cache — {preview.length} question{preview.length === 1 ? '' : 's'}</>
                  : streamDone
                    ? <>✓ Done — {preview.length} question{preview.length === 1 ? '' : 's'} generated</>
                    : <>Select questions to add ({selected.size} of {preview.length} selected)</>
              }
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {fromCache && (
                <button
                  type="button"
                  className="btn small ghost"
                  onClick={handleRegenerate}
                  title="Bypass cache and generate fresh questions"
                >
                  ↺ Regenerate
                </button>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {slideResult && `📂 ${slideResult.fileName} · `}{difficultyLabel}
              </span>
            </div>
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
