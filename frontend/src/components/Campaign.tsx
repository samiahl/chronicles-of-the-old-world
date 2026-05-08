import { useState } from 'react'
import type { Narrative, Battle } from '../types'
import { api } from '../api/client'
import Modal from './Modal'

interface Props {
  campaignId: string
  narratives: Narrative[]
  battles: Battle[]
  readOnly?: boolean
  onReload: () => void
  toast: (msg: string, type?: 'ok' | 'err') => void
}

export default function Campaign({ campaignId, narratives, battles, readOnly, onReload, toast }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')
  const [battleId, setBattleId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post(`/campaigns/${campaignId}/narratives`, {
        title,
        content,
        author: author || null,
        battleId: battleId || null,
      })
      setTitle(''); setContent(''); setAuthor(''); setBattleId('')
      setShowModal(false)
      await onReload()
      toast('Entry inscribed in the chronicle')
    } catch {
      toast('Failed to add entry', 'err')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this chronicle entry?')) return
    try {
      await api.delete(`/campaigns/${campaignId}/narratives/${id}`)
      await onReload()
      toast('Entry struck from the chronicle')
    } catch {
      toast('Failed to remove entry', 'err')
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Chronicles of Blood and Glory</h2>
          <p className="section-desc">The unfolding saga of the campaign</p>
        </div>
        {!readOnly && <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Entry</button>}
      </div>

      {narratives.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <div className="empty-text">The chronicle is empty. Begin the saga.</div>
        </div>
      ) : (
        <div className="narrative-timeline">
          {narratives.map(n => (
            <div key={n.id} className="narrative-entry">
              <div className="narrative-title">{n.title}</div>
              <div className="narrative-meta">
                {n.author && <span>By {n.author} · </span>}
                <span>{fmtDateTime(n.createdAt)}</span>
                {n.battleId && n.player1Name && (
                  <span> · Linked to: {n.player1Name} vs {n.player2Name} {n.battleDate ? `(${fmtDate(n.battleDate)})` : ''}</span>
                )}
              </div>
              {n.battleId && (
                <div className="narrative-battle-badge">⚔ Battle #{n.battleId.slice(-4)}</div>
              )}
              <div className="narrative-content">{n.content}</div>
              {!readOnly && (
                <div className="narrative-actions">
                  <button className="btn-danger" onClick={() => handleDelete(n.id)}>Remove</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Chronicle Entry" wide>
        <form onSubmit={handleSubmit}>
          <div className="form-row-3">
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="The Fall of Hive City Primus…" />
            </div>
            <div className="form-group">
              <label>Author</label>
              <input value={author} onChange={e => setAuthor(e.target.value)}
                placeholder="Chronicler, GM…" />
            </div>
            <div className="form-group">
              <label>Related Battle (optional)</label>
              <select value={battleId} onChange={e => setBattleId(e.target.value)}>
                <option value="">— None —</option>
                {battles.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.player1Name} vs {b.player2Name} ({fmtDate(b.date)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Chronicle Entry</label>
            <textarea rows={10} value={content} onChange={e => setContent(e.target.value)} required
              placeholder="Write the narrative here…" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Inscribe</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
