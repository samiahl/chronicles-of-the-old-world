import { useState, useEffect, useRef } from 'react'
import { api, setToken } from '../api/client'
import { uploadImage, AVATAR_MAX_BYTES } from '../api/cloudinary'
import type { ArmyList, Campaign, Player, User } from '../types'

interface Props {
  authUser: User
  onBack: () => void
  onUpdate: (user: User, token?: string) => void
  onLogout: () => void
  toast: (msg: string, type?: 'ok' | 'err') => void
}

export default function UserProfilePage({ authUser, onBack, onUpdate, onLogout, toast }: Props) {
  const [username, setUsername] = useState(authUser.username)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  // per-campaign expanded army lists: campaignId -> lists | null (loading)
  const [expandedLists, setExpandedLists] = useState<Record<string, ArmyList[] | null>>({})

  useEffect(() => {
    api.get<Campaign[]>('/campaigns')
      .then(all => {
        setCampaigns(all.filter(c => c.members.some(m => m.userId === authUser.id)))
        setPendingCampaigns(all.filter(c => c.pendingRequests.some(r => r.userId === authUser.id)))
      })
      .catch(() => toast('Failed to load campaigns', 'err'))
      .finally(() => setLoadingCampaigns(false))
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword && newPassword !== confirmPassword) {
      toast('Passwords do not match', 'err')
      return
    }
    setSavingProfile(true)
    try {
      const res = await api.put<{ token: string; user: User }>('/auth/me', {
        username: username || null,
        password: newPassword || null,
      })
      setToken(res.token)
      localStorage.setItem('auth_user', JSON.stringify(res.user))
      onUpdate(res.user, res.token)
      setNewPassword('')
      setConfirmPassword('')
      toast('Profile updated')
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      toast(status === 409 ? 'Username already taken' : 'Failed to update profile', 'err')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > AVATAR_MAX_BYTES) { toast('Avatar must be under 500KB', 'err'); return }
    try {
      const url = await uploadImage(file)
      const updated = await api.put<User>('/auth/me/avatar', { picture: url })
      localStorage.setItem('auth_user', JSON.stringify(updated))
      onUpdate(updated)
      toast('Avatar updated')
    } catch {
      toast('Failed to update avatar', 'err')
    }
  }

  const handleLeaveCampaign = async (campaign: Campaign) => {
    if (!confirm(`Leave "${campaign.name}"? Your player and army lists in this campaign will be removed.`)) return
    try {
      await api.delete(`/campaigns/${campaign.id}/leave`)
      setCampaigns(cs => cs.filter(c => c.id !== campaign.id))
      toast(`Left ${campaign.name}`)
    } catch {
      toast('Failed to leave campaign', 'err')
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Delete your account? This cannot be undone. Your player data will be removed from all campaigns.')) return
    if (!confirm('Are you sure? All your data will be permanently deleted.')) return
    try {
      await api.delete('/auth/me')
      onLogout()
    } catch {
      toast('Failed to delete account', 'err')
    }
  }

  const toggleCampaignLists = async (campaign: Campaign) => {
    if (expandedLists[campaign.id] !== undefined) {
      setExpandedLists(s => { const n = { ...s }; delete n[campaign.id]; return n })
      return
    }
    setExpandedLists(s => ({ ...s, [campaign.id]: null }))
    try {
      const [lists, players] = await Promise.all([
        api.get<ArmyList[]>(`/campaigns/${campaign.id}/army-lists`),
        api.get<Player[]>(`/campaigns/${campaign.id}/players`),
      ])
      const myPlayer = players.find(p => p.userId === authUser.id)
      const myLists = myPlayer ? lists.filter(l => l.playerId === myPlayer.id) : []
      setExpandedLists(s => ({ ...s, [campaign.id]: myLists }))
    } catch {
      setExpandedLists(s => { const n = { ...s }; delete n[campaign.id]; return n })
      toast('Failed to load army lists', 'err')
    }
  }

  return (
    <div className="campaign-list-page">
      <header>
        <div className="header-line" />
        <h1 className="campaign-title">⚔ Chronicles of Blood and Glory ⚔</h1>
        <p className="campaign-subtitle">My Profile</p>
        <div className="header-user-bar">
          <button className="btn-ghost back-btn" onClick={onBack}>← Back</button>
        </div>
      </header>

      <div className="profile-page-body">

        {/* ── Profile settings ──────────────────────────────────────── */}
        <section className="profile-page-section">
          <h2 className="profile-page-section-title">Account Settings</h2>
          <div className="profile-page-card">
            <div className="profile-page-avatar-row">
              {authUser.profilePicture
                ? <img src={authUser.profilePicture} alt="" className="profile-page-avatar-img" />
                : <div className="profile-page-avatar-placeholder">{authUser.username.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div className="profile-page-username">{authUser.username}</div>
                <button className="btn-ghost btn-sm" onClick={() => avatarRef.current?.click()}>
                  Change avatar
                </button>
                <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-page-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} maxLength={30} required />
                </div>
                <div className="form-group">
                  <label>New Password <span className="form-optional">(leave blank to keep current)</span></label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
              </div>
              {newPassword && (
                <div className="form-group" style={{ maxWidth: '50%' }}>
                  <label>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={savingProfile}>Save Changes</button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Campaigns & army lists ────────────────────────────────── */}
        <section className="profile-page-section">
          <h2 className="profile-page-section-title">My Campaigns</h2>
          {loadingCampaigns ? (
            <p className="profile-empty">Loading…</p>
          ) : campaigns.length === 0 && pendingCampaigns.length === 0 ? (
            <p className="profile-empty">You are not part of any campaigns yet.</p>
          ) : (
            <div className="profile-page-campaigns">
              {pendingCampaigns.map(c => (
                <div key={c.id} className="profile-page-campaign-card profile-page-campaign-pending">
                  <div className="profile-page-campaign-header">
                    <div>
                      <div className="profile-pending-badge">Request pending</div>
                      <div className="profile-page-campaign-name">{c.name}</div>
                      {c.theme && <div className="profile-page-campaign-theme">{c.theme}</div>}
                    </div>
                  </div>
                </div>
              ))}
              {campaigns.map(c => {
                const isExpanded = expandedLists[c.id] !== undefined
                const lists = expandedLists[c.id]
                return (
                  <div key={c.id} className="profile-page-campaign-card">
                    <div className="profile-page-campaign-header">
                      <div>
                        <div className="profile-page-campaign-name">{c.name}</div>
                        {c.theme && <div className="profile-page-campaign-theme">{c.theme}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-ghost btn-sm" onClick={() => toggleCampaignLists(c)}>
                          {isExpanded ? 'Hide Lists ▴' : 'My Lists ▾'}
                        </button>
                        {c.createdBy !== authUser.id && (
                          <button className="btn-danger btn-sm" onClick={() => handleLeaveCampaign(c)}>Leave</button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="profile-page-lists">
                        {lists === null ? (
                          <p className="profile-empty">Loading…</p>
                        ) : lists.length === 0 ? (
                          <p className="profile-empty">No army lists in this campaign.</p>
                        ) : (
                          lists.map(l => (
                            <div key={l.id} className="profile-page-list-row">
                              <div>
                                <span className="profile-list-name">{l.name}</span>
                                {l.faction && <span className="profile-page-list-faction"> · {l.faction}</span>}
                              </div>
                              {l.gameSize != null && <span className="profile-list-pts">{l.gameSize}pts</span>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Danger zone ──────────────────────────────────────────── */}
        <section className="profile-page-section">
          <h2 className="profile-page-section-title profile-danger-title">Danger Zone</h2>
          <div className="profile-page-card profile-danger-card">
            <div className="profile-danger-row">
              <div>
                <div className="profile-danger-label">Delete Account</div>
                <div className="profile-danger-desc">Permanently delete your account. Your battle reports and army lists will remain but you will be marked as an inactive player.</div>
              </div>
              <button className="btn-danger" onClick={handleDeleteAccount}>Delete Account</button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
