import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { Campaign, Milestone, User } from '../types'

interface Props {
  authUser: User
  onSelect: (campaign: Campaign) => void
}

export default function CampaignList({ authUser, onSelect }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createTheme, setCreateTheme] = useState('')
  const [joinState, setJoinState] = useState<Record<string, { show: boolean; commanderName: string; faction: string }>>({})
  const [error, setError] = useState('')
  const [createType, setCreateType] = useState<'standard' | 'path_of_glory' | 'battle_march'>('standard')
  const [createSubType, setCreateSubType] = useState('')
  const [createStartingPoints, setCreateStartingPoints] = useState('500')
  const [createMilestones, setCreateMilestones] = useState<{ name: string; points: string }[]>([])
  const [createPointsLimit, setCreatePointsLimit] = useState('500')

  const load = async () => {
    try {
      const data = await api.get<Campaign[]>('/campaigns')
      setCampaigns(data)
    } catch {
      setError('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const milestones: Milestone[] = createType === 'path_of_glory'
        ? createMilestones.map(m => ({ name: m.name, points: parseInt(m.points) || 0 }))
        : []
      const campaign = await api.post<Campaign>('/campaigns', {
        name: createName,
        description: createDesc || null,
        theme: createTheme || null,
        type: createType,
        subType: createType === 'standard' && createSubType ? createSubType : null,
        startingPoints: createType === 'path_of_glory' ? parseInt(createStartingPoints) || 500 : null,
        milestones,
        pointsLimit: createType === 'battle_march' ? parseInt(createPointsLimit) || 500 : null,
      })
      setCreateName(''); setCreateDesc(''); setCreateTheme('')
      setCreateType('standard'); setCreateSubType(''); setCreateStartingPoints('500')
      setCreateMilestones([]); setCreatePointsLimit('500')
      setShowCreate(false)
      await load()
      onSelect(campaign)
    } catch {
      setError('Failed to create campaign')
    }
  }

  const handleRequestJoin = async (campaignId: string) => {
    const state = joinState[campaignId]
    if (!state?.commanderName.trim()) return
    try {
      await api.post(`/campaigns/${campaignId}/request-join`, {
        commanderName: state.commanderName,
        faction: state.faction || null,
      })
      setJoinState(s => ({ ...s, [campaignId]: { ...s[campaignId], show: false } }))
      await load()
    } catch {
      setError('Failed to send join request')
    }
  }

  function typeBadge(c: Campaign) {
    if (c.type === 'path_of_glory') return <div className="campaign-type-badge">Path of Glory</div>
    if (c.type === 'battle_march') return <div className="campaign-type-badge">Battle March · {c.pointsLimit ?? 500}pts</div>
    if (c.type === 'standard' && c.subType) return <div className="campaign-type-badge">{c.subType === 'league' ? 'League' : 'Tournament'}</div>
    return null
  }

  const activeCampaigns = campaigns.filter(c => c.status !== 'finished')
  const myCampaigns = activeCampaigns.filter(c => c.members.some(m => m.userId === authUser.id))
  const otherCampaigns = activeCampaigns.filter(c => !c.members.some(m => m.userId === authUser.id))
  const finishedCampaigns = campaigns.filter(c => c.status === 'finished')

  return (
    <div className="campaign-list-page">
      <header>
        <div className="header-line" />
        <h1 className="campaign-title">⚔ Chronicles of Blood and Glory ⚔</h1>
        <p className="campaign-subtitle">The Old World Campaign Manager</p>
        <div className="header-line" />
      </header>

      <div className="campaign-list-content">
        <div className="campaign-list-header">
          <div>
            <h2 className="section-title">Campaigns</h2>
            <p className="section-desc">Welcome, {authUser.username}. Choose your campaign.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            + New Campaign
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {showCreate && (
          <form className="campaign-create-form" onSubmit={handleCreate}>
            <h3 className="form-section-title">Found a New Campaign</h3>
            <div className="form-row-3">
              <div className="form-group">
                <label>Campaign Name</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)} required
                  placeholder="The Siege of Altdorf…" />
              </div>
              <div className="form-group">
                <label>Theme (optional)</label>
                <input value={createTheme} onChange={e => setCreateTheme(e.target.value)}
                  placeholder="Age of Sigmar, Old World…" />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input value={createDesc} onChange={e => setCreateDesc(e.target.value)}
                  placeholder="Brief description…" />
              </div>
            </div>
            <div className="campaign-type-selector">
              {(['standard', 'path_of_glory', 'battle_march'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`type-btn${createType === t ? ' active' : ''}`}
                  onClick={() => setCreateType(t)}
                >
                  {t === 'standard' ? 'Standard' : t === 'path_of_glory' ? 'Path of Glory' : 'Battle March'}
                </button>
              ))}
            </div>

            {createType === 'standard' && (
              <div className="form-group">
                <label>Sub-type (optional)</label>
                <select value={createSubType} onChange={e => setCreateSubType(e.target.value)}>
                  <option value="">— None —</option>
                  <option value="league">League</option>
                  <option value="tournament">Tournament</option>
                </select>
              </div>
            )}

            {createType === 'path_of_glory' && (
              <div className="form-group">
                <label>Starting Points</label>
                <input type="number" value={createStartingPoints} onChange={e => setCreateStartingPoints(e.target.value)} min="0" />
                <label style={{ marginTop: '0.75rem' }}>Number of Milestones</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={createMilestones.length}
                  onChange={e => {
                    const n = Math.max(0, Math.min(10, parseInt(e.target.value) || 0))
                    setCreateMilestones(ms => {
                      if (n > ms.length) return [...ms, ...Array(n - ms.length).fill({ name: '', points: '' })]
                      return ms.slice(0, n)
                    })
                  }}
                />
                {createMilestones.length > 0 && <label style={{ marginTop: '0.75rem' }}>Milestones</label>}
                <div className="milestone-builder">
                  {createMilestones.map((m, i) => (
                    <div key={i} className="milestone-row">
                      <input
                        placeholder="Milestone name…"
                        value={m.name}
                        onChange={e => setCreateMilestones(ms => ms.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      />
                      <input
                        type="number"
                        placeholder="Points"
                        value={m.points}
                        onChange={e => setCreateMilestones(ms => ms.map((x, j) => j === i ? { ...x, points: e.target.value } : x))}
                        min="0"
                      />
                      <button type="button" className="btn-danger" onClick={() => setCreateMilestones(ms => ms.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                  <button type="button" className="char-add-btn" onClick={() => setCreateMilestones(ms => [...ms, { name: '', points: '' }])}>+ Add Milestone</button>
                </div>
              </div>
            )}

            {createType === 'battle_march' && (
              <div className="form-group">
                <label>Points Limit</label>
                <input type="number" value={createPointsLimit} onChange={e => setCreatePointsLimit(e.target.value)} min="0" />
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Establish Campaign</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="empty-state"><div className="empty-icon">⏳</div><div className="empty-text">Loading…</div></div>
        ) : (
          <>
            {myCampaigns.length > 0 && (
              <section className="campaign-section">
                <h3 className="campaign-section-title">My Campaigns</h3>
                <div className="campaign-cards">
                  {myCampaigns.map(c => (
                    <div key={c.id} className="campaign-card" onClick={() => onSelect(c)}>
                      <div className="campaign-card-name">{c.name}</div>
                      {typeBadge(c)}
                      {c.theme && <div className="campaign-card-theme">{c.theme}</div>}
                      {c.description && <div className="campaign-card-desc">{c.description}</div>}
                      <div className="campaign-card-meta">
                        {c.members.length} member{c.members.length !== 1 ? 's' : ''} · by {c.createdByName}
                      </div>
                      <div className="campaign-card-enter">Enter Campaign →</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {otherCampaigns.length > 0 && (
              <section className="campaign-section">
                <h3 className="campaign-section-title">Other Campaigns</h3>
                <div className="campaign-cards">
                  {otherCampaigns.map(c => {
                    const hasPending = c.pendingRequests.some(r => r.userId === authUser.id)
                    const js = joinState[c.id]
                    return (
                      <div key={c.id} className="campaign-card campaign-card-other">
                        <div className="campaign-card-name">{c.name}</div>
                        {typeBadge(c)}
                        {c.theme && <div className="campaign-card-theme">{c.theme}</div>}
                        {c.description && <div className="campaign-card-desc">{c.description}</div>}
                        <div className="campaign-card-meta">
                          {c.members.length} member{c.members.length !== 1 ? 's' : ''} · by {c.createdByName}
                        </div>
                        {hasPending ? (
                          <div className="campaign-pending-badge">Request Pending…</div>
                        ) : c.status === 'finished' ? (
                          <div className="campaign-pending-badge">Campaign Finished</div>
                        ) : js?.show ? (
                          <div className="campaign-join-form">
                            <input
                              placeholder="Commander name…"
                              value={js.commanderName}
                              onChange={e => setJoinState(s => ({ ...s, [c.id]: { ...s[c.id], commanderName: e.target.value } }))}
                            />
                            <input
                              placeholder="Faction (optional)…"
                              value={js.faction}
                              onChange={e => setJoinState(s => ({ ...s, [c.id]: { ...s[c.id], faction: e.target.value } }))}
                            />
                            <div className="form-actions">
                              <button className="btn-secondary"
                                onClick={() => setJoinState(s => ({ ...s, [c.id]: { ...s[c.id], show: false } }))}>
                                Cancel
                              </button>
                              <button className="btn-primary" onClick={() => handleRequestJoin(c.id)}>
                                Send Request
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn-secondary campaign-join-btn"
                            onClick={() => setJoinState(s => ({ ...s, [c.id]: { show: true, commanderName: '', faction: '' } }))}
                          >
                            Request to Join
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {finishedCampaigns.length > 0 && (
              <section className="campaign-section">
                <h3 className="campaign-section-title campaign-section-title-finished">Finished Campaigns</h3>
                <div className="campaign-cards">
                  {finishedCampaigns.map(c => (
                    <div key={c.id} className="campaign-card campaign-card-finished" onClick={() => onSelect(c)}>
                      <div className="campaign-finished-badge">Finished</div>
                      <div className="campaign-card-name">{c.name}</div>
                      {typeBadge(c)}
                      {c.theme && <div className="campaign-card-theme">{c.theme}</div>}
                      {c.description && <div className="campaign-card-desc">{c.description}</div>}
                      <div className="campaign-card-meta">
                        {c.members.length} member{c.members.length !== 1 ? 's' : ''} · by {c.createdByName}
                      </div>
                      <div className="campaign-card-enter">View Campaign →</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {campaigns.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">⚔</div>
                <div className="empty-text">No campaigns yet. Be the first to establish one.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
