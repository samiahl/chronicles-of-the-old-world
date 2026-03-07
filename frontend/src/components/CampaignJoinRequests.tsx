import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { CampaignJoinRequest } from '../types'

interface Props {
  campaignId: string
  onApproved: () => void
}

export default function CampaignJoinRequests({ campaignId, onApproved }: Props) {
  const [requests, setRequests] = useState<CampaignJoinRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await api.get<CampaignJoinRequest[]>(`/campaigns/${campaignId}/requests`)
      setRequests(data)
    } catch {
      // Not creator or no requests — hide silently
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [campaignId])

  const handleApprove = async (userId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/requests/${userId}/approve`, {})
      await load()
      onApproved()
    } catch {
      // ignore
    }
  }

  const handleReject = async (userId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/requests/${userId}/reject`, {})
      await load()
    } catch {
      // ignore
    }
  }

  if (loading || requests.length === 0) return null

  return (
    <div className="join-requests-panel">
      <h3 className="join-requests-title">Pending Join Requests ({requests.length})</h3>
      <div className="join-requests-list">
        {requests.map(r => (
          <div key={r.userId} className="join-request-item">
            <div className="join-request-info">
              <span className="join-request-username">{r.username}</span>
              <span className="join-request-commander"> as {r.commanderName}</span>
              {r.faction && <span className="join-request-faction"> · {r.faction}</span>}
            </div>
            <div className="join-request-actions">
              <button className="btn-secondary" onClick={() => handleReject(r.userId)}>Reject</button>
              <button className="btn-primary" onClick={() => handleApprove(r.userId)}>Approve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
