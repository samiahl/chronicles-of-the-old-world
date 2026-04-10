import { useEffect, useState } from 'react'
import type { Player, ArmyList, Battle, UserCampaignSummary } from '../types'
import { api } from '../api/client'

interface Props {
  player: Player
  armyLists: ArmyList[]
  battles: Battle[]
  onClose: () => void
}

export default function PlayerProfile({ player, armyLists, battles, onClose }: Props) {
  const [campaigns, setCampaigns] = useState<UserCampaignSummary[] | null>(null)
  const [campaignsErr, setCampaignsErr] = useState(false)

  useEffect(() => {
    if (!player.userId) { setCampaigns([]); return }
    api.get<UserCampaignSummary[]>(`/user-campaigns?userId=${player.userId}`)
      .then(setCampaigns)
      .catch(() => setCampaignsErr(true))
  }, [player.userId])

  const myLists = armyLists.filter(a => a.playerId === player.id)
  const myBattles = battles.filter(b => b.player1Id === player.id || b.player2Id === player.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const wins   = myBattles.filter(b => (b.player1Id === player.id && b.result === 'player1') || (b.player2Id === player.id && b.result === 'player2')).length
  const losses = myBattles.filter(b => (b.player1Id === player.id && b.result === 'player2') || (b.player2Id === player.id && b.result === 'player1')).length
  const draws  = myBattles.filter(b => b.result === 'draw').length

  const initial = player.name.charAt(0).toUpperCase()

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>×</button>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="profile-header">
          <div className="profile-avatar">{initial}</div>
          <div className="profile-header-info">
            <div className="profile-name">{player.name}</div>
            <div className="profile-faction">{player.faction ?? 'Unknown faction'}</div>
            {!player.userId && (
              <div className="profile-unlinked">Guest commander · not linked to an account</div>
            )}
          </div>
        </div>

        <div className="profile-sections">

          {/* ── Profile Details ────────────────────────────────────────── */}
          <section className="profile-section">
            <h3 className="profile-section-title">Profile</h3>
            <div className="profile-details-grid">
              <div className="profile-detail">
                <span className="profile-detail-label">Commander</span>
                <span className="profile-detail-value">{player.name}</span>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-label">Faction</span>
                <span className="profile-detail-value">{player.faction ?? '—'}</span>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-label">Enlisted</span>
                <span className="profile-detail-value">{fmtDate(player.createdAt)}</span>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-label">Record</span>
                <span className="profile-detail-value">
                  <span className="rec-win">{wins}W</span>
                  {' / '}
                  <span className="rec-loss">{losses}L</span>
                  {' / '}
                  <span className="rec-draw">{draws}D</span>
                </span>
              </div>
            </div>
          </section>

          {/* ── Army Lists ─────────────────────────────────────────────── */}
          <section className="profile-section">
            <h3 className="profile-section-title">Army Lists <span className="profile-count">({myLists.length})</span></h3>
            {myLists.length === 0 ? (
              <p className="profile-empty">No lists filed in this campaign.</p>
            ) : (
              <div className="profile-list-rows">
                {myLists.map(a => (
                  <div key={a.id} className="profile-list-row">
                    <span className="profile-list-name">{a.name}</span>
                    {a.gameSize != null && <span className="profile-list-pts">{a.gameSize}pts</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Campaigns ──────────────────────────────────────────────── */}
          <section className="profile-section">
            <h3 className="profile-section-title">
              Campaigns
              {campaigns != null && <span className="profile-count"> ({campaigns.length})</span>}
            </h3>
            {!player.userId ? (
              <p className="profile-empty">Not linked to an account — campaign history unavailable.</p>
            ) : campaignsErr ? (
              <p className="profile-empty">Could not load campaign history.</p>
            ) : campaigns == null ? (
              <p className="profile-empty">Loading…</p>
            ) : campaigns.length === 0 ? (
              <p className="profile-empty">No campaigns found.</p>
            ) : (
              <div className="profile-campaign-rows">
                {campaigns.map(c => (
                  <div key={c.id} className="profile-campaign-row">
                    <span className="profile-campaign-name">{c.name}</span>
                    <span className="profile-campaign-meta">
                      {typeLabel(c.type)} · {c.membersCount} commander{c.membersCount !== 1 ? 's' : ''}
                    </span>
                    <span className={`profile-campaign-status status-${c.status}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Own Games ──────────────────────────────────────────────── */}
          <section className="profile-section">
            <h3 className="profile-section-title">Games <span className="profile-count">({myBattles.length})</span></h3>
            {myBattles.length === 0 ? (
              <p className="profile-empty">No battles recorded yet.</p>
            ) : (
              <div className="profile-games-list">
                {myBattles.map(b => {
                  const isP1 = b.player1Id === player.id
                  const opponent = isP1 ? b.player2Name : b.player1Name
                  const result = b.result === 'draw' ? 'draw'
                    : (isP1 && b.result === 'player1') || (!isP1 && b.result === 'player2') ? 'win' : 'loss'
                  return (
                    <div key={b.id} className="profile-game-row">
                      <span className={`profile-game-result result-${result}`}>{result.toUpperCase()}</span>
                      <span className="profile-game-vs">vs {opponent}</span>
                      <span className="profile-game-date">{fmtDate(b.date)}</span>
                      {b.scenario && <span className="profile-game-scenario">{b.scenario}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function typeLabel(type: string) {
  return { standard: 'Standard', path_of_glory: 'Path of Glory', battle_march: 'Battle March' }[type] ?? type
}
