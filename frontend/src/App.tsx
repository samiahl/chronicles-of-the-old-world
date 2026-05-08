import { useState, useEffect, useCallback } from 'react'
import { api, setToken } from './api/client'
import type { Player, Battle, ArmyList, Narrative, ScoreboardEntry, User, Campaign, ScheduledGame, Challenge } from './types'
import Annals from './components/Annals'
import Modal from './components/Modal'
import CampaignChronicle from './components/Campaign'
import ArmyLists from './components/ArmyLists'
import Players from './components/Players'
import Calendar from './components/Calendar'
import ChallengeBoard from './components/ChallengeBoard'
import LoginPage from './components/LoginPage'
import CampaignList from './components/CampaignList'
import UserProfilePage from './components/UserProfilePage'

type Tab = 'annals' | 'chronicle' | 'armies' | 'players' | 'calendar' | 'challenges'

interface AppData {
  players: Player[]
  battles: Battle[]
  armyLists: ArmyList[]
  narratives: Narrative[]
  scoreboard: ScoreboardEntry[]
  scheduledGames: ScheduledGame[]
  challenges: Challenge[]
}

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(loadStoredUser)
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null)
  const [tab, setTab] = useState<Tab>('annals')
  const [data, setData] = useState<AppData>({
    players: [],
    battles: [],
    armyLists: [],
    narratives: [],
    scoreboard: [],
    scheduledGames: [],
    challenges: [],
  })
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'ok' | 'err' }[]>([])
  const [showCampaignEdit, setShowCampaignEdit] = useState(false)
  const [campaignEditForm, setCampaignEditForm] = useState({ name: '', description: '', theme: '' })
  const [showProfilePage, setShowProfilePage] = useState(false)

  const toast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const reload = useCallback(async (campaignId?: string) => {
    const cid = campaignId ?? currentCampaign?.id
    if (!cid) return
    setLoading(true)
    try {
      const [players, battles, armyLists, narratives, scoreboard, scheduledGames, challenges] = await Promise.all([
        api.get<Player[]>(`/campaigns/${cid}/players`),
        api.get<Battle[]>(`/campaigns/${cid}/battles`),
        api.get<ArmyList[]>(`/campaigns/${cid}/army-lists`),
        api.get<Narrative[]>(`/campaigns/${cid}/narratives`),
        api.get<ScoreboardEntry[]>(`/campaigns/${cid}/scoreboard`),
        api.get<ScheduledGame[]>(`/campaigns/${cid}/calendar`),
        api.get<Challenge[]>(`/campaigns/${cid}/challenges`),
      ])
      setData({ players, battles, armyLists, narratives, scoreboard, scheduledGames, challenges })
    } catch {
      toast('Failed to load campaign data — is the backend running?', 'err')
    } finally {
      setLoading(false)
    }
  }, [currentCampaign?.id, toast])

  useEffect(() => {
    if (currentCampaign) reload(currentCampaign.id)
  }, [currentCampaign?.id])

  // Listen for auth expiry from any API call
  useEffect(() => {
    const handler = () => handleLogout()
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [])

  const handleLogin = (user: User) => {
    setAuthUser(user)
    setCurrentCampaign(null)
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('auth_user')
    setAuthUser(null)
    setCurrentCampaign(null)
    setData({ players: [], battles: [], armyLists: [], narratives: [], scoreboard: [], scheduledGames: [], challenges: [] })
  }

  const handleSelectCampaign = (campaign: Campaign) => {
    setCurrentCampaign(campaign)
    setTab('annals')
  }

  const openCampaignEdit = () => {
    setCampaignEditForm({
      name: currentCampaign!.name,
      description: currentCampaign!.description ?? '',
      theme: currentCampaign!.theme ?? '',
    })
    setShowCampaignEdit(true)
  }

  const handleSaveCampaign = async () => {
    try {
      const updated = await api.put<Campaign>(`/campaigns/${currentCampaign!.id}`, {
        name: campaignEditForm.name,
        description: campaignEditForm.description || null,
        theme: campaignEditForm.theme || null,
      })
      setCurrentCampaign(updated)
      setShowCampaignEdit(false)
      toast('Campaign updated')
    } catch {
      toast('Failed to update campaign', 'err')
    }
  }

  const handleAdvancePhase = async () => {
    try {
      const updated = await api.post<Campaign>(`/campaigns/${currentCampaign!.id}/advance-phase`, {})
      setCurrentCampaign(updated)
      toast('Campaign advanced to next phase')
    } catch {
      toast('Failed to advance phase', 'err')
    }
  }

  const handleReopenCampaign = async () => {
    try {
      const updated = await api.post<Campaign>(`/campaigns/${currentCampaign!.id}/reopen`, {})
      setCurrentCampaign(updated)
      setShowCampaignEdit(false)
      toast('Campaign re-opened')
    } catch {
      toast('Failed to re-open campaign', 'err')
    }
  }

  const handleFinishCampaign = async () => {
    if (!confirm(`Mark "${currentCampaign!.name}" as finished? The campaign will become read-only and no new players can join.`)) return
    try {
      const updated = await api.post<Campaign>(`/campaigns/${currentCampaign!.id}/finish`, {})
      setCurrentCampaign(updated)
      setShowCampaignEdit(false)
      toast('Campaign marked as finished')
    } catch {
      toast('Failed to finish campaign', 'err')
    }
  }

  const handleDeleteCampaign = async () => {
    if (!confirm(`Delete campaign "${currentCampaign!.name}"? This cannot be undone. All campaign data will be permanently removed.`)) return
    if (!confirm('Are you sure? All battle reports, army lists, and player records will be deleted.')) return
    try {
      await api.delete(`/campaigns/${currentCampaign!.id}`)
      setCurrentCampaign(null)
      toast('Campaign deleted')
    } catch {
      toast('Failed to delete campaign', 'err')
    }
  }

  // Not logged in
  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Profile page
  if (showProfilePage) {
    return (
      <UserProfilePage
        authUser={authUser}
        onBack={() => setShowProfilePage(false)}
        onUpdate={(user, token) => {
          if (token) setToken(token)
          localStorage.setItem('auth_user', JSON.stringify(user))
          setAuthUser(user)
        }}
        onLogout={handleLogout}
        toast={toast}
      />
    )
  }

  // Logged in but no campaign selected
  if (!currentCampaign) {
    return <CampaignList authUser={authUser} onSelect={handleSelectCampaign} />
  }

  function phaseLabel(c: Campaign): string {
    if (c.currentPhase === 0) return `Starting Phase · ${c.startingPoints ?? 500}pts`
    const m = c.milestones[c.currentPhase - 1]
    return m ? `${m.name} · ${m.points}pts` : `Phase ${c.currentPhase}`
  }
  const isCreator = authUser.id === currentCampaign.createdBy

  const myPlayer = data.players.find(p => p.userId === authUser.id)
  const incomingChallenges = myPlayer
    ? data.challenges.filter(c => c.toPlayerId === myPlayer.id && c.status === 'open').length
    : 0

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'annals',     label: 'Battle Reports' },
    { id: 'chronicle',  label: 'The Chronicle' },
    { id: 'armies',     label: 'Army Lists' },
    { id: 'players',    label: 'Players' },
    { id: 'calendar',   label: 'Calendar' },
    { id: 'challenges', label: 'Challenge Board', badge: incomingChallenges || undefined },
  ]

  return (
    <>
      <header>
        <div className="header-line" />
        <h1 className="campaign-title">⚔ {currentCampaign.name} ⚔</h1>
        <p className="campaign-subtitle">
          {currentCampaign.theme ?? 'The Old World Campaign Manager'}
          {isCreator && (
            <button className="btn-ghost btn-sm" style={{ marginLeft: '0.75rem' }} onClick={openCampaignEdit}>Edit</button>
          )}
        </p>
        {currentCampaign.status === 'finished' && (
          <div className="campaign-finished-banner">Campaign Finished</div>
        )}
        {currentCampaign.type === 'path_of_glory' && (
          <div className="campaign-type-line">
            <span className="phase-display">{phaseLabel(currentCampaign)}</span>
            {isCreator && currentCampaign.currentPhase < currentCampaign.milestones.length && (
              <button className="btn-ghost btn-sm" onClick={handleAdvancePhase}>Advance Phase →</button>
            )}
          </div>
        )}
        {currentCampaign.type === 'battle_march' && (
          <div className="campaign-type-line">Battle March · {currentCampaign.pointsLimit ?? 500}pts</div>
        )}
        {currentCampaign.type === 'standard' && currentCampaign.subType && (
          <div className="campaign-type-line">{currentCampaign.subType === 'league' ? 'League' : 'Tournament'}</div>
        )}
        <div className="header-user-bar">
          <button className="btn-ghost back-btn" onClick={() => setCurrentCampaign(null)}>
            ← Campaigns
          </button>
          <div className="user-info">
            {authUser.profilePicture && (
              <img src={authUser.profilePicture} alt="" className="user-avatar" />
            )}
            <button className="btn-ghost user-name" onClick={() => setShowProfilePage(true)}>{authUser.username}</button>
            <button className="btn-ghost" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
        <div className="header-line" />
      </header>

      <nav className="tab-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.badge ? <span className="tab-badge">{t.badge}</span> : null}
          </button>
        ))}
      </nav>

      <main>
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-text">Summoning the chronicles…</div>
          </div>
        ) : (
          <>
            {tab === 'annals' && (
              <Annals
                campaignId={currentCampaign.id}
                battles={data.battles}
                players={data.players}
                scoreboard={data.scoreboard}
                scheduledGames={data.scheduledGames}
                readOnly={currentCampaign.status === 'finished'}
                onReload={reload}
                toast={toast}
              />
            )}
            {tab === 'chronicle' && (
              <CampaignChronicle
                campaignId={currentCampaign.id}
                narratives={data.narratives}
                battles={data.battles}
                readOnly={currentCampaign.status === 'finished'}
                onReload={reload}
                toast={toast}
              />
            )}
            {tab === 'armies' && (
              <ArmyLists
                campaignId={currentCampaign.id}
                armyLists={data.armyLists}
                players={data.players}
                authUser={authUser}
                currentCampaign={currentCampaign}
                onReload={reload}
                toast={toast}
              />
            )}
            {tab === 'players' && (
              <Players
                campaignId={currentCampaign.id}
                players={data.players}
                armyLists={data.armyLists}
                battles={data.battles}
                authUser={authUser}
                currentCampaign={currentCampaign}
                onReload={reload}
                toast={toast}
              />
            )}
            {tab === 'calendar' && (
              <Calendar
                campaignId={currentCampaign.id}
                scheduledGames={data.scheduledGames}
                players={data.players}
                authUser={authUser}
                readOnly={currentCampaign.status === 'finished'}
                onReload={reload}
                toast={toast}
              />
            )}
            {tab === 'challenges' && (
              <ChallengeBoard
                campaignId={currentCampaign.id}
                challenges={data.challenges}
                players={data.players}
                authUser={authUser}
                readOnly={currentCampaign.status === 'finished'}
                onReload={reload}
                toast={toast}
              />
            )}
          </>
        )}
      </main>

      <Modal isOpen={showCampaignEdit} onClose={() => setShowCampaignEdit(false)} title="Edit Campaign">
        <div className="form-group">
          <label>Campaign Name</label>
          <input value={campaignEditForm.name} onChange={e => setCampaignEditForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label>Theme <span className="form-optional">(optional)</span></label>
          <input value={campaignEditForm.theme} onChange={e => setCampaignEditForm(f => ({ ...f, theme: e.target.value }))} placeholder="The Old World Campaign Manager" />
        </div>
        <div className="form-group">
          <label>Description <span className="form-optional">(optional)</span></label>
          <textarea rows={3} value={campaignEditForm.description} onChange={e => setCampaignEditForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn-danger" onClick={handleDeleteCampaign}>Delete Campaign</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentCampaign?.status === 'finished' ? (
              <button className="btn-secondary" onClick={handleReopenCampaign}>Re-open Campaign</button>
            ) : (
              <button className="btn-secondary" onClick={handleFinishCampaign}>Mark as Finished</button>
            )}
            <button className="btn-secondary" onClick={() => setShowCampaignEdit(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveCampaign} disabled={!campaignEditForm.name.trim()}>Save</button>
          </div>
        </div>
      </Modal>

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast${t.type === 'err' ? ' toast-err' : ''}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}
