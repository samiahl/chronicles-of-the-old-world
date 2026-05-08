import type { ArmyList } from '../types'

interface Props {
  armyList: ArmyList
  onClose: () => void
  onBack: () => void
}

export default function ArmyListPanel({ armyList: a, onClose, onBack }: Props) {
  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>×</button>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="profile-header">
          <div className="profile-avatar">⚔</div>
          <div className="profile-header-info">
            <div className="profile-name">{a.name}</div>
            {a.faction && <div className="profile-faction">{a.faction}</div>}
            <div className="profile-unlinked">
              {a.playerName}{a.gameSize != null ? ` · ${a.gameSize}pts` : ''}
            </div>
          </div>
        </div>

        {/* ── Back button ─────────────────────────────────────────────── */}
        <div style={{ padding: '0.6rem 1.25rem 0', borderBottom: '1px solid var(--gold-border)' }}>
          <button className="btn-ghost btn-sm" onClick={onBack}>← Back to commander</button>
        </div>

        <div className="profile-sections">

          {/* ── Characters ─────────────────────────────────────────────── */}
          {a.characters.length > 0 && (
            <section className="profile-section">
              <h3 className="profile-section-title">Characters <span className="profile-count">({a.characters.length})</span></h3>
              <div className="armypanel-chars">
                {a.characters.map(c => (
                  <div key={c.id} className="armypanel-char-card">
                    <div className="armypanel-char-header">
                      <span className="armypanel-char-name">{c.name}</span>
                      {c.rank && <span className="armypanel-char-rank">{c.rank}</span>}
                      {c.xp != null && <span className="xp-badge">{c.xp} XP</span>}
                    </div>
                    {c.isCaster && (
                      <div className="armypanel-char-stats">
                        <span className="armypanel-stat">Misfires: {c.misfires}</span>
                        <span className="armypanel-stat">Miscasts: {c.miscasts}</span>
                        <span className="armypanel-stat">Perfect Invocations: {c.perfectInvocations}</span>
                      </div>
                    )}
                    {c.modifiers && <div className="armypanel-char-notes">{c.modifiers}</div>}
                    {c.notes && <div className="armypanel-char-notes">{c.notes}</div>}
                    {c.magicalItems.length > 0 && (
                      <div className="armypanel-char-items">
                        {c.magicalItems.map((item, i) => (
                          <span key={i} className="armypanel-item-tag">{item}</span>
                        ))}
                      </div>
                    )}
                    {c.heroicActions.length > 0 && (
                      <div className="armypanel-char-items">
                        {c.heroicActions.map((action, i) => (
                          <span key={i} className="armypanel-item-tag armypanel-heroic-tag">{action}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Units ──────────────────────────────────────────────────── */}
          {a.units.length > 0 && (
            <section className="profile-section">
              <h3 className="profile-section-title">Units <span className="profile-count">({a.units.length})</span></h3>
              <div className="armypanel-units">
                {a.units.map(u => (
                  <div key={u.id} className="armypanel-unit-row">
                    <span className="unit-name">{u.name}</span>
                    {u.xp != null && <span className="xp-badge">{u.xp} XP</span>}
                    {u.notes && <span className="unit-notes"> — {u.notes}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Army List Text ─────────────────────────────────────────── */}
          {a.content && (
            <section className="profile-section">
              <h3 className="profile-section-title">Full List</h3>
              <pre className="armypanel-content">{a.content}</pre>
            </section>
          )}

          {a.characters.length === 0 && a.units.length === 0 && !a.content && (
            <p className="profile-empty">No details added to this list yet.</p>
          )}

        </div>
      </div>
    </div>
  )
}
