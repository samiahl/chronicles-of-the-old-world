import { useRef, useState } from 'react'
import type { Challenge, Player, User } from '../types'
import { api } from '../api/client'

interface Props {
  campaignId: string
  challenges: Challenge[]
  players: Player[]
  authUser: User
  readOnly?: boolean
  onReload: () => void
  toast: (msg: string, type?: 'ok' | 'err') => void
}

export default function ChallengeBoard({ campaignId, challenges, players, authUser, readOnly, onReload, toast }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [fromPlayerId, setFromPlayerId] = useState('')
  const [toPlayerId, setToPlayerId] = useState('')
  const [message, setMessage] = useState('')
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionOpen, setMentionOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const myPlayer = players.find(p => p.userId === authUser.id)

  const filteredMentions = mentionSearch
    ? players.filter(p => p.name.toLowerCase().includes(mentionSearch.toLowerCase()) && p.id !== fromPlayerId)
    : players.filter(p => p.id !== fromPlayerId)

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessage(val)

    const cursor = e.target.selectionStart ?? val.length
    const before = val.slice(0, cursor)
    const match = before.match(/@([^@\n]*)$/)

    if (match) {
      setMentionSearch(match[1])
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
      setMentionSearch('')
    }
  }

  const handleMentionSelect = (player: Player) => {
    const ta = textareaRef.current
    const cursor = ta?.selectionStart ?? message.length
    const before = message.slice(0, cursor)
    const after  = message.slice(cursor)
    const match  = before.match(/@([^@\n]*)$/)
    if (match) {
      const replaced = before.slice(0, before.length - match[0].length) + `@${player.name}` + after
      setMessage(replaced)
      setToPlayerId(player.id)
    }
    setMentionOpen(false)
    setMentionSearch('')
    setTimeout(() => ta?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') setMentionOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromPlayerId) return toast('Select your commander first', 'err')
    if (!message.trim()) return toast('Write your challenge', 'err')

    let resolvedToId = toPlayerId
    if (!resolvedToId) {
      const mentionMatch = message.match(/@([^\n@]+)/)
      if (mentionMatch) {
        const name = mentionMatch[1].trim()
        const found = players.find(p => p.name.toLowerCase() === name.toLowerCase())
        if (found) resolvedToId = found.id
      }
    }
    if (!resolvedToId) return toast('Tag the challenged player with @name', 'err')
    if (resolvedToId === fromPlayerId) return toast('You cannot challenge yourself', 'err')

    try {
      await api.post(`/campaigns/${campaignId}/challenges`, {
        fromPlayerId,
        toPlayerId: resolvedToId,
        message: message.trim(),
      })
      setMessage('')
      setFromPlayerId('')
      setToPlayerId('')
      setShowForm(false)
      await onReload()
      toast('Challenge issued!')
    } catch {
      toast('Failed to issue challenge', 'err')
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/campaigns/${campaignId}/challenges/${id}`, { status })
      await onReload()
    } catch {
      toast('Failed to update challenge', 'err')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/campaigns/${campaignId}/challenges/${id}`)
      await onReload()
      toast('Challenge withdrawn')
    } catch {
      toast('Failed to withdraw challenge', 'err')
    }
  }

  const openChallenges    = challenges.filter(c => c.status === 'open')
  const otherChallenges   = challenges.filter(c => c.status !== 'open')

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Challenge Board</h2>
          <p className="section-desc">Honour demands satisfaction</p>
        </div>
        {!readOnly && (
          <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? '× Close' : '+ New Challenge'}
          </button>
        )}
      </div>

      {/* ── New Challenge Form ──────────────────────────────────────────── */}
      {showForm && (
        <div className="parchment-form-wrap">
          <form className="parchment-form" onSubmit={handleSubmit}>
            <div className="parchment-seal">⚜</div>
            <div className="parchment-heading">A Declaration of Challenge</div>

            <div className="parchment-from-row">
              <label className="parchment-label">Issued by</label>
              <select
                className="parchment-select"
                value={fromPlayerId}
                onChange={e => { setFromPlayerId(e.target.value); setToPlayerId(''); }}
                required
              >
                <option value="">— your commander —</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.faction ? ` (${p.faction})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="parchment-textarea-wrap">
              <textarea
                ref={textareaRef}
                className="parchment-textarea"
                rows={7}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder={"@PlayerName\nI challenge thy champion to a duel\nby the old mill at dusk…"}
                required
              />
              {mentionOpen && filteredMentions.length > 0 && (
                <div className="mention-dropdown">
                  {filteredMentions.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="mention-option"
                      onMouseDown={e => { e.preventDefault(); handleMentionSelect(p) }}
                    >
                      <span className="mention-name">{p.name}</span>
                      {p.faction && <span className="mention-faction">{p.faction}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {toPlayerId && (
              <div className="parchment-addressed">
                Addressed to: <strong>{players.find(p => p.id === toPlayerId)?.name}</strong>
              </div>
            )}

            <div className="parchment-form-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Withdraw</button>
              <button type="submit" className="btn-primary">Seal & Issue</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Open Challenges ─────────────────────────────────────────────── */}
      {challenges.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon">⚔</div>
          <div className="empty-text">No challenges issued yet. Honour awaits the bold.</div>
        </div>
      ) : (
        <>
          {openChallenges.length > 0 && (
            <div className="challenge-notes-grid">
              {openChallenges.map((c, i) => (
                <ChallengeNote
                  key={c.id}
                  challenge={c}
                  index={i}
                  myPlayer={myPlayer}
                  readOnly={readOnly}
                  onStatus={updateStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {otherChallenges.length > 0 && (
            <div className="challenge-resolved-section">
              <div className="challenge-resolved-title">Concluded</div>
              <div className="challenge-notes-grid challenge-notes-concluded">
                {otherChallenges.map((c, i) => (
                  <ChallengeNote
                    key={c.id}
                    challenge={c}
                    index={i}
                    myPlayer={myPlayer}
                    onStatus={updateStatus}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Challenge Note ─────────────────────────────────────────────────────────

interface NoteProps {
  challenge: Challenge
  index: number
  myPlayer: Player | undefined
  readOnly?: boolean
  onStatus: (id: string, status: string) => void
  onDelete: (id: string) => void
}

const ROTATIONS = [-2, 1.5, -1, 2, -0.5, 1, -1.8, 0.5]

function ChallengeNote({ challenge: c, index, myPlayer, readOnly, onStatus, onDelete }: NoteProps) {
  const rot = ROTATIONS[index % ROTATIONS.length]
  const isTarget = myPlayer?.id === c.toPlayerId
  const isAuthor = myPlayer?.id === c.fromPlayerId

  const highlightedMessage = c.message.replace(
    /@([^\n@]+)/g,
    '<span class="note-mention">@$1</span>'
  )

  return (
    <div
      className={`challenge-note status-note-${c.status}${isTarget ? ' note-mine' : ''}`}
      style={{ '--rot': `${rot}deg` } as React.CSSProperties}
    >
      <div className="note-status-ribbon">{statusLabel(c.status)}</div>
      <div className="note-from">{c.fromPlayerName}</div>
      <div
        className="note-message"
        dangerouslySetInnerHTML={{ __html: highlightedMessage }}
      />
      <div className="note-date">{fmtDate(c.createdAt)}</div>

      <div className="note-actions">
        {!readOnly && isTarget && c.status === 'open' && (
          <>
            <button className="note-btn note-accept" onClick={() => onStatus(c.id, 'accepted')}>Accept</button>
            <button className="note-btn note-decline" onClick={() => onStatus(c.id, 'declined')}>Decline</button>
          </>
        )}
        {!readOnly && (isTarget || isAuthor) && c.status === 'accepted' && (
          <button className="note-btn note-resolve" onClick={() => onStatus(c.id, 'resolved')}>Mark Resolved</button>
        )}
        {!readOnly && (isAuthor || isTarget) && (
          <button className="note-btn note-delete" onClick={() => onDelete(c.id)}>×</button>
        )}
      </div>
    </div>
  )
}

function statusLabel(s: string) {
  return { open: 'Open', accepted: 'Accepted', declined: 'Declined', resolved: 'Resolved' }[s] ?? s
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
