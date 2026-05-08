import { useState } from 'react'
import type { ScheduledGame, Player, User } from '../types'
import { api } from '../api/client'
import Modal from './Modal'

interface Props {
  campaignId: string
  scheduledGames: ScheduledGame[]
  players: Player[]
  authUser: User
  onReload: () => void
  toast: (msg: string, type?: 'ok' | 'err') => void
}

interface GameForm {
  date: string
  player1Id: string
  player2Id: string
  notes: string
}

const emptyForm = (date = ''): GameForm => ({
  date,
  player1Id: '',
  player2Id: '',
  notes: '',
})

export default function Calendar({ campaignId, scheduledGames, players, authUser, onReload, toast }: Props) {
  const myPlayer = players.find(p => p.userId === authUser.id)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<GameForm>(emptyForm)

  const set = (k: keyof GameForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date) return toast('Select a date', 'err')
    if (!form.player1Id || !form.player2Id) return toast('Select both players', 'err')
    if (form.player1Id === form.player2Id) return toast('Players must be different', 'err')
    try {
      await api.post(`/campaigns/${campaignId}/calendar`, {
        date: form.date,
        player1Id: form.player1Id,
        player2Id: form.player2Id,
        notes: form.notes || null,
        createdBy: authUser.id,
      })
      setForm(emptyForm())
      setShowModal(false)
      await onReload()
      toast('Game scheduled')
    } catch {
      toast('Failed to schedule game', 'err')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/campaigns/${campaignId}/calendar/${id}`)
      await onReload()
      toast('Game removed from calendar')
    } catch {
      toast('Failed to remove game', 'err')
    }
  }

  const openScheduleOn = (dateStr: string) => {
    setForm(emptyForm(dateStr))
    setShowModal(true)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayStr = fmtIso(today)
  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  // Games indexed by date string
  const gamesByDate: Record<string, ScheduledGame[]> = {}
  for (const g of scheduledGames) {
    if (!gamesByDate[g.date]) gamesByDate[g.date] = []
    gamesByDate[g.date].push(g)
  }

  // Upcoming games sorted
  const upcoming = scheduledGames
    .filter(g => g.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Campaign Calendar</h2>
          <p className="section-desc">Schedule and track upcoming battles</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm()); setShowModal(true) }}>
          + Schedule Game
        </button>
      </div>

      {/* Month grid */}
      <div className="cal-wrap">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <span className="cal-month-label">{monthName}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>

        <div className="cal-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const games = gamesByDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isPast = dateStr < todayStr
            return (
              <div
                key={dateStr}
                className={`cal-cell${isToday ? ' cal-today' : ''}${isPast ? ' cal-past' : ''}`}
                onClick={() => !isPast && openScheduleOn(dateStr)}
                title={isPast ? undefined : 'Click to schedule a game'}
              >
                <span className="cal-day-num">{day}</span>
                {games.map(g => {
                  const canDelete = myPlayer && (g.player1Id === myPlayer.id || g.player2Id === myPlayer.id)
                  return (
                    <div key={g.id} className="cal-game-chip" onClick={e => e.stopPropagation()}>
                      <span className="cal-chip-text">{g.player1Name} vs {g.player2Name}</span>
                      {canDelete && (
                        <button
                          className="cal-chip-del"
                          onClick={e => { e.stopPropagation(); handleDelete(g.id) }}
                          title="Remove"
                        >×</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming list */}
      {upcoming.length > 0 && (
        <div className="cal-upcoming">
          <h3 className="cal-upcoming-title">Upcoming Battles</h3>
          <div className="cal-upcoming-list">
            {upcoming.map(g => {
              const canDelete = myPlayer && (g.player1Id === myPlayer.id || g.player2Id === myPlayer.id)
              return (
                <div key={g.id} className="cal-upcoming-item">
                  <div className="cal-upcoming-date">{fmtDisplay(g.date)}</div>
                  <div className="cal-upcoming-matchup">
                    <span className="cal-upcoming-player">{g.player1Name}</span>
                    <span className="cal-upcoming-vs">vs</span>
                    <span className="cal-upcoming-player">{g.player2Name}</span>
                  </div>
                  {g.notes && <div className="cal-upcoming-notes">{g.notes}</div>}
                  {canDelete && <button className="btn-danger" onClick={() => handleDelete(g.id)}>Remove</button>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {upcoming.length === 0 && scheduledGames.length === 0 && (
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          <div className="empty-icon">📅</div>
          <div className="empty-text">No games scheduled yet.</div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Schedule a Game">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.date} onChange={set('date')} required min={todayStr} />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>Player 1</label>
              <select value={form.player1Id} onChange={set('player1Id')} required>
                <option value="">— Select —</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.faction ? ` (${p.faction})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Player 2</label>
              <select value={form.player2Id} onChange={set('player2Id')} required>
                <option value="">— Select —</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.faction ? ` (${p.faction})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes <span className="form-optional">(optional)</span></label>
            <textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Location, time, scenario…" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Schedule</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function fmtIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDisplay(s: string): string {
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
