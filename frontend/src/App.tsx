import { useState, useEffect, useCallback, useRef } from 'react'
import { api, setToken } from './api/client'
import type { Player, Battle, ArmyList, Narrative, ScoreboardEntry, User, Campaign, ScheduledGame, UserCampaignSummary, Challenge } from './types'
import Annals from './components/Annals'
import Modal from './components/Modal'
import CampaignChronicle from './components/Campaign'
import ArmyLists from './components/ArmyLists'
import Players from './components/Players'
import Calendar from './components/Calendar'
import ChallengeBoard from './components/ChallengeBoard'
import LoginPage from './components/LoginPage'
import CampaignList from './components/CampaignList'

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
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({ username: '', newPassword: '', confirmPassword: '' })
  const profileImageRef = useRef<HTMLInputElement>(null)

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

  const openProfileModal = () => {
    setProfileForm({ username: authUser!.username, newPassword: '', confirmPassword: '' })
    setShowProfileModal(true)
  }

  const handleSaveProfile = async () => {
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      toast('Passwords do not match', 'err')
      return
    }
    try {
      const res = await api.put<{ token: string; user: User }>('/auth/me', {
        username: profileForm.username || null,
        password: profileForm.newPassword || null,
      })
      setToken(res.token)
      localStorage.setItem('auth_user', JSON.stringify(res.user))
      setAuthUser(res.user)
      setShowProfileModal(false)
      toast('Profile updated')
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      toast(status === 409 ? 'Username already taken' : 'Failed to update profile', 'err')
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const b64 = ev.target?.result as string
      try {
        const updated = await api.put<User>('/auth/me/avatar', { picture: b64 })
        localStorage.setItem('auth_user', JSON.stringify(updated))
        setAuthUser(updated)
        toast('Avatar updated')
      } catch {
        toast('Failed to update avatar', 'err')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleAdvancePhase = async () => {
    try {
      const updated = await api.post<Campaign>(`/campaigns/${currentCampaign!.id}/advance-phase`)
      setCurrentCampaign(updated)
      toast('Campaign advanced to next phase')
    } catch {
      toast('Failed to advance phase', 'err')
    }
  }

  // Not logged in
  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />
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
            <button className="btn-ghost user-name" onClick={openProfileModal}>{authUser.username}</button>
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
                onReload={reload}
                toast={toast}
              />
            )}
            {tab === 'chronicle' && (
              <CampaignChronicle
                campaignId={currentCampaign.id}
                narratives={data.narratives}
                battles={data.battles}
                onReload={reload}
                toast={toast}
              />
            )}
            {tab === 'armies' && (
              <ArmyLists
                campaignId={currentCampaign.id}
                armyLists={data.armyLists}
                players={data.players}
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
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowCampaignEdit(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveCampaign} disabled={!campaignEditForm.name.trim()}>Save</button>
        </div>
      </Modal>

      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Profile Settings">
        <div className="form-group">
          <label>Username</label>
          <input value={profileForm.username} onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>New Password <span className="form-optional">(leave blank to keep current)</span></label>
          <input type="password" value={profileForm.newPassword} onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))} />
        </div>
        {profileForm.newPassword && (
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={profileForm.confirmPassword} onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))} />
          </div>
        )}
        <div className="form-group">
          <label>Profile Picture <span className="form-optional">(optional)</span></label>
          <input ref={profileImageRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="file-input" />
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveProfile}>Save</button>
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
