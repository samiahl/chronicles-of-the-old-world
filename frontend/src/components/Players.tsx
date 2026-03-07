import { useState } from 'react'
import type { Player, Campaign, User } from '../types'
import { api } from '../api/client'
import Modal from './Modal'
import CampaignJoinRequests from './CampaignJoinRequests'

interface Props {
  campaignId: string
  players: Player[]
  authUser: User
  currentCampaign: Campaign
  onReload: () => void
  toast: (msg: string, type?: 'ok' | 'err') => void
}

export default function Players({ campaignId, players, authUser, currentCampaign, onReload, toast }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [faction, setFaction] = useState('')

  const isCreator = currentCampaign.createdBy === authUser.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post(`/campaigns/${campaignId}/players`, { name, faction: faction || null })
      setName('')
      setFaction('')
      setShowModal(false)
      await onReload()
      toast('Commander enlisted')
    } catch {
      toast('Failed to add player', 'err')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this commander from the campaign?')) return
    try {
      await api.delete(`/campaigns/${campaignId}/players/${id}`)
      await onReload()
      toast('Commander removed')
    } catch {
      toast('Failed to remove player', 'err')
    }
  }

  return (
    <div>
      {isCreator && (
        <CampaignJoinRequests campaignId={campaignId} onApproved={onReload} />
      )}

      <div className="section-header">
        <div>
          <h2 className="section-title">Campaign Participants</h2>
          <p className="section-desc">The commanders who vie for dominion</p>
        </div>
        {isCreator && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Enlist</button>
        )}
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚔</div>
          <div className="empty-text">No commanders enlisted yet.</div>
        </div>
      ) : (
        <div className="players-grid">
          {players.map(p => (
            <div key={p.id} className="player-card">
              <div>
                <div className="player-name">{p.name}</div>
                <div className="player-faction">{p.faction ?? 'Unknown faction'}</div>
                <div className="player-date">Enlisted {fmtDate(p.createdAt)}</div>
              </div>
              {isCreator && (
                <button className="btn-danger" onClick={() => handleDelete(p.id)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {isCreator && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Enlist New Commander">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Commander Name</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                required placeholder="Lord Maximilian von Kriegh…"
              />
            </div>
            <div className="form-group">
              <label>Faction / Army</label>
              <input
                value={faction} onChange={e => setFaction(e.target.value)}
                placeholder="Empire, Chaos, Orks…"
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Enlist</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function fmtDate(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
