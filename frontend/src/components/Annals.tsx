import { useState, useRef } from 'react'
import type { Battle, Player, ScoreboardEntry, ScheduledGame } from '../types'
import { api } from '../api/client'
import Modal from './Modal'

interface Props {
  campaignId: string
  battles: Battle[]
  players: Player[]
  scoreboard: ScoreboardEntry[]
  scheduledGames: ScheduledGame[]
  onReload: () => void
  toast: (msg: string, type?: 'ok' | 'err') => void
}

interface BattleForm {
  date: string
  player1Id: string
  player2Id: string
  scenario: string
  gameSize: string
  result: string
  player1Vp: string
  player2Vp: string
  player1Report: string
  player2Report: string
  openPoints1: string
  openPoints2: string
  images: string[]
}

const emptyForm = (): BattleForm => ({
  date: new Date().toISOString().slice(0, 10),
  player1Id: '',
  player2Id: '',
  scenario: '',
  gameSize: '',
  result: '',
  player1Vp: '0',
  player2Vp: '0',
  player1Report: '',
  player2Report: '',
  openPoints1: '',
  openPoints2: '',
  images: [],
})

export default function Annals({ campaignId, battles, players, scoreboard, scheduledGames, onReload, toast }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<BattleForm>(emptyForm)
  const [linkedGameId, setLinkedGameId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ player1Report: string; player2Report: string; openPoints1: string; openPoints2: string }>({
    player1Report: '', player2Report: '', openPoints1: '', openPoints2: '',
  })
  const [showStandings, setShowStandings] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof BattleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const b64 = ev.target?.result as string
        setForm(f => ({ ...f, images: [...f.images, b64] }))
      }
      reader.readAsDataURL(file)
    })
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const removeImage = (idx: number) =>
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.result) return toast('Select a battle result', 'err')
    if (form.player1Id === form.player2Id) return toast('Players must be different', 'err')
    try {
      await api.post(`/campaigns/${campaignId}/battles`, {
        date: form.date,
        player1Id: form.player1Id,
        player2Id: form.player2Id,
        scenario: form.scenario || null,
        gameSize: form.gameSize ? parseInt(form.gameSize) : null,
        result: form.result,
        player1Vp: parseInt(form.player1Vp) || 0,
        player2Vp: parseInt(form.player2Vp) || 0,
        player1Report: form.player1Report || null,
        player2Report: form.player2Report || null,
        openPoints1: form.openPoints1 ? parseInt(form.openPoints1) : null,
        openPoints2: form.openPoints2 ? parseInt(form.openPoints2) : null,
        images: form.images,
      })
      setForm(emptyForm())
      setLinkedGameId('')
      setShowModal(false)
      await onReload()
      toast('Battle recorded')
    } catch {
      toast('Failed to record battle', 'err')
    }
  }

  const startEdit = (b: Battle) => {
    setEditingId(b.id)
    setEditForm({
      player1Report: b.player1Report ?? '',
      player2Report: b.player2Report ?? '',
      openPoints1: b.openPoints1 != null ? String(b.openPoints1) : '',
      openPoints2: b.openPoints2 != null ? String(b.openPoints2) : '',
    })
  }

  const handleSaveEdit = async (battleId: string) => {
    try {
      await api.put(`/campaigns/${campaignId}/battles/${battleId}`, {
        player1Report: editForm.player1Report || null,
        player2Report: editForm.player2Report || null,
        openPoints1: editForm.openPoints1 ? parseInt(editForm.openPoints1) : null,
        openPoints2: editForm.openPoints2 ? parseInt(editForm.openPoints2) : null,
      })
      setEditingId(null)
      await onReload()
      toast('Battle report updated')
    } catch {
      toast('Failed to update battle report', 'err')
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Battle Reports</h2>
          <p className="section-desc">Every clash recorded for posterity</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => setShowStandings(!showStandings)}>
            {showStandings ? 'Hide Standings' : 'Show Standings'}
          </button>
          <button className="btn-primary" onClick={() => { setForm(emptyForm()); setLinkedGameId(''); setShowModal(true) }}>+ Log Battle</button>
        </div>
      </div>

      {showStandings && scoreboard.length > 0 && (
        <div className="standings-panel">
          <h3 className="standings-title">Campaign Standings</h3>
          <p className="standings-note">Ranked by narrative points (manually assigned per battle)</p>
          <div className="table-wrap">
            <table className="scoreboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Commander</th>
                  <th>Faction</th>
                  <th>Narrative Pts</th>
                  <th>GP</th>
                  <th className="col-win">W</th>
                  <th className="col-draw">D</th>
                  <th className="col-loss">L</th>
                  <th>VP+</th>
                  <th>VP−</th>
                </tr>
              </thead>
              <tbody>
                {scoreboard.map((entry, i) => (
                  <tr key={entry.id} className={i === 0 ? 'rank-first' : ''}>
                    <td className="rank-cell">{i === 0 ? '👑' : i + 1}</td>
                    <td className="name-cell">{entry.name}</td>
                    <td className="faction-cell">{entry.faction ?? '—'}</td>
                    <td className="points-cell">{entry.points}</td>
                    <td className="stat-cell">{entry.gamesPlayed}</td>
                    <td className="stat-cell col-win">{entry.wins}</td>
                    <td className="stat-cell col-draw">{entry.draws}</td>
                    <td className="stat-cell col-loss">{entry.losses}</td>
                    <td className="stat-cell">{entry.vpFor}</td>
                    <td className="stat-cell">{entry.vpAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {battles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚔</div>
          <div className="empty-text">No battles recorded yet.</div>
        </div>
      ) : (
        <div className="battles-list">
          {battles.map(b => {
            const p1wins = b.result === 'player1'
            const p2wins = b.result === 'player2'
            const isDraw = b.result === 'draw'
            const isExpanded = expandedId === b.id
            const isEditing = editingId === b.id
            const hasReports = b.player1Report || b.player2Report
            const hasImages = b.images && b.images.length > 0

            return (
              <div key={b.id} className="battle-card">
                <div className="battle-card-header">
                  <div className="battle-meta">
                    {fmtDate(b.date)}
                    {b.gameSize ? ` · ${b.gameSize}pts` : ''}
                    {b.scenario ? ` · ${b.scenario}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="battle-num">Battle #{b.id.slice(-4)}</span>
                    <button className="btn-secondary btn-sm" onClick={() => startEdit(b)}>Edit</button>
                  </div>
                </div>

                <div className="battle-combatants">
                  <div className={`combatant ${p1wins ? 'winner' : p2wins ? 'loser' : 'draw'}`}>
                    <div className="combatant-name">{b.player1Name}</div>
                    <div className="combatant-faction">{b.player1Faction ?? ''}</div>
                    <div className="combatant-vp">{b.player1Vp} VP</div>
                    {b.openPoints1 != null && b.openPoints1 > 0 && (
                      <div className="narrative-pts">+{b.openPoints1} narrative pts</div>
                    )}
                    {p1wins && <div className="victory-badge">Victory</div>}
                  </div>

                  <div className="vs-badge">
                    <span className="vs-text">VS</span>
                    <span className="vs-icon">{isDraw ? '🤝' : '⚔'}</span>
                    {isDraw && <span className="draw-label">Draw</span>}
                  </div>

                  <div className={`combatant ${p2wins ? 'winner' : p1wins ? 'loser' : 'draw'}`}>
                    <div className="combatant-name">{b.player2Name}</div>
                    <div className="combatant-faction">{b.player2Faction ?? ''}</div>
                    <div className="combatant-vp">{b.player2Vp} VP</div>
                    {b.openPoints2 != null && b.openPoints2 > 0 && (
                      <div className="narrative-pts">+{b.openPoints2} narrative pts</div>
                    )}
                    {p2wins && <div className="victory-badge">Victory</div>}
                  </div>
                </div>

                {isEditing && (
                  <div className="battle-edit-panel">
                    <h4 className="edit-panel-title">Edit Battle Report</h4>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Narrative Points — {b.player1Name}</label>
                        <input type="number" min="0"
                          value={editForm.openPoints1}
                          onChange={e => setEditForm(f => ({ ...f, openPoints1: e.target.value }))}
                          placeholder="0" />
                      </div>
                      <div className="form-group">
                        <label>Narrative Points — {b.player2Name}</label>
                        <input type="number" min="0"
                          value={editForm.openPoints2}
                          onChange={e => setEditForm(f => ({ ...f, openPoints2: e.target.value }))}
                          placeholder="0" />
                      </div>
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>{b.player1Name}'s Account</label>
                        <textarea rows={5} value={editForm.player1Report}
                          onChange={e => setEditForm(f => ({ ...f, player1Report: e.target.value }))}
                          placeholder="From the perspective of Player 1…" />
                      </div>
                      <div className="form-group">
                        <label>{b.player2Name}'s Account</label>
                        <textarea rows={5} value={editForm.player2Report}
                          onChange={e => setEditForm(f => ({ ...f, player2Report: e.target.value }))}
                          placeholder="From the perspective of Player 2…" />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      <button className="btn-primary" onClick={() => handleSaveEdit(b.id)}>Save</button>
                    </div>
                  </div>
                )}

                {(hasReports || hasImages) && !isEditing && (
                  <div className="reports-section">
                    <button
                      className="reports-toggle"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    >
                      {isExpanded ? '▾ Hide Reports' : '▸ Read Battle Reports'}
                    </button>
                    {isExpanded && (
                      <>
                        {hasImages && (
                          <div className="battle-images">
                            {b.images.map((img, i) => (
                              <img key={i} src={img} alt={`Battle image ${i + 1}`} className="battle-image" />
                            ))}
                          </div>
                        )}
                        {hasReports && (
                          <div className="reports-grid">
                            <ReportBlock label={`${b.player1Name}'s Account`} text={b.player1Report} />
                            <ReportBlock label={`${b.player2Name}'s Account`} text={b.player2Report} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Battle" wide>
        <form onSubmit={handleSubmit}>
          {scheduledGames.length > 0 && (
            <div className="form-group">
              <label>Link to Scheduled Game <span className="form-optional">(optional)</span></label>
              <select value={linkedGameId} onChange={e => {
                const id = e.target.value
                setLinkedGameId(id)
                if (id) {
                  const g = scheduledGames.find(x => x.id === id)
                  if (g) setForm(f => ({ ...f, date: g.date, player1Id: g.player1Id, player2Id: g.player2Id }))
                }
              }}>
                <option value="">— Enter manually —</option>
                {scheduledGames.map(g => (
                  <option key={g.id} value={g.id}>{fmtDate(g.date)} · {g.player1Name} vs {g.player2Name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-row-3">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={set('date')} required />
            </div>
            <div className="form-group">
              <label>Scenario</label>
              <input value={form.scenario} onChange={set('scenario')} placeholder="Eternal War…" />
            </div>
            <div className="form-group">
              <label>Points</label>
              <input type="number" value={form.gameSize} onChange={set('gameSize')} placeholder="2000" />
            </div>
          </div>

          <div className="form-row-3 battle-players-row">
            <div className="form-group">
              <label>Player 1</label>
              <select value={form.player1Id} onChange={set('player1Id')} required>
                <option value="">— Select —</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}{p.faction ? ` (${p.faction})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Result</label>
              <select value={form.result} onChange={set('result')} required>
                <option value="">— Result —</option>
                <option value="player1">Player 1 Wins</option>
                <option value="draw">Draw</option>
                <option value="player2">Player 2 Wins</option>
              </select>
            </div>
            <div className="form-group">
              <label>Player 2</label>
              <select value={form.player2Id} onChange={set('player2Id')} required>
                <option value="">— Select —</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name}{p.faction ? ` (${p.faction})` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Player 1 Victory Points</label>
              <input type="number" min="0" value={form.player1Vp} onChange={set('player1Vp')} />
            </div>
            <div className="form-group">
              <label>Player 2 Victory Points</label>
              <input type="number" min="0" value={form.player2Vp} onChange={set('player2Vp')} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Narrative Points — Player 1 (optional)</label>
              <input type="number" min="0" value={form.openPoints1} onChange={set('openPoints1')}
                placeholder="Manually assigned…" />
            </div>
            <div className="form-group">
              <label>Narrative Points — Player 2 (optional)</label>
              <input type="number" min="0" value={form.openPoints2} onChange={set('openPoints2')}
                placeholder="Manually assigned…" />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Player 1 Battle Report</label>
              <textarea rows={5} value={form.player1Report} onChange={set('player1Report')}
                placeholder="From the perspective of Player 1…" />
            </div>
            <div className="form-group">
              <label>Player 2 Battle Report</label>
              <textarea rows={5} value={form.player2Report} onChange={set('player2Report')}
                placeholder="From the perspective of Player 2…" />
            </div>
          </div>

          <div className="form-group">
            <label>Battle Images (optional)</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="file-input"
            />
            {form.images.length > 0 && (
              <div className="image-preview-row">
                {form.images.map((img, i) => (
                  <div key={i} className="image-preview-item">
                    <img src={img} alt={`Preview ${i + 1}`} className="image-preview-thumb" />
                    <button type="button" className="image-remove-btn" onClick={() => removeImage(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Record Battle</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function ReportBlock({ label, text }: { label: string; text: string | null }) {
  return (
    <div className="report-block">
      <div className="report-label">{label}</div>
      {text
        ? <div className="report-text">{text}</div>
        : <div className="report-empty">No account submitted.</div>}
    </div>
  )
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
