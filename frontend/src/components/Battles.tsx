import { useState } from 'react'
import type { Battle, Player } from '../types'
import { api } from '../api/client'
import Modal from './Modal'

interface Props {
  battles: Battle[]
  players: Player[]
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
  notes: string
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
  notes: '',
})

export default function Battles({ battles, players, onReload, toast }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<BattleForm>(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const set = (k: keyof BattleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.result) return toast('Select a battle result', 'err')
    if (form.player1Id === form.player2Id) return toast('Players must be different', 'err')
    try {
      await api.post('/battles', {
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
        notes: form.notes || null,
      })
      setForm(emptyForm)
      setShowModal(false)
      await onReload()
      toast('Battle recorded in the annals')
    } catch {
      toast('Failed to record battle', 'err')
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Battle Reports</h2>
          <p className="section-desc">Every clash recorded for posterity</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Log Battle</button>
      </div>

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
            const hasReports = b.player1Report || b.player2Report

            return (
              <div key={b.id} className="battle-card">
                <div className="battle-card-header">
                  <div className="battle-meta">
                    {fmtDate(b.date)}
                    {b.gameSize ? ` · ${b.gameSize}pts` : ''}
                    {b.scenario ? ` · ${b.scenario}` : ''}
                  </div>
                  <span className="battle-num">Battle #{b.id.slice(-4)}</span>
                </div>

                <div className="battle-combatants">
                  <div className={`combatant ${p1wins ? 'winner' : p2wins ? 'loser' : 'draw'}`}>
                    <div className="combatant-name">{b.player1Name}</div>
                    <div className="combatant-faction">{b.player1Faction ?? ''}</div>
                    <div className="combatant-vp">{b.player1Vp} VP</div>
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
                    {p2wins && <div className="victory-badge">Victory</div>}
                  </div>
                </div>

                {b.notes && (
                  <div className="battle-notes">{b.notes}</div>
                )}

                {hasReports && (
                  <div className="reports-section">
                    <button
                      className="reports-toggle"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    >
                      {isExpanded ? '▾ Hide Reports' : '▸ Read Battle Reports'}
                    </button>
                    {isExpanded && (
                      <div className="reports-grid">
                        <ReportBlock label={`${b.player1Name}'s Account`} text={b.player1Report} />
                        <ReportBlock label={`${b.player2Name}'s Account`} text={b.player2Report} />
                      </div>
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
              <label>Player 1 Battle Report</label>
              <textarea rows={6} value={form.player1Report} onChange={set('player1Report')}
                placeholder="From the perspective of Player 1…" />
            </div>
            <div className="form-group">
              <label>Player 2 Battle Report</label>
              <textarea rows={6} value={form.player2Report} onChange={set('player2Report')}
                placeholder="From the perspective of Player 2…" />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={set('notes')}
              placeholder="Terrain used, house rules, anything worth remembering…" />
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
