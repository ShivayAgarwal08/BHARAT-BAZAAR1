import { useEffect, useState } from 'react'
import { listAssistedRegistrations, updateAssistedRegistration } from '../api/admin'

const statuses = ['pending', 'contacted', 'completed', 'cancelled']

export default function AdminAssistedRegistrations() {
  const [requests, setRequests] = useState([])
  useEffect(() => {
    let active = true
    listAssistedRegistrations()
      .then(({ data }) => { if (active) setRequests(data) })
      .catch((error) => console.error('Failed to load registration requests', error))
    return () => { active = false }
  }, [])
  const save = async (request, changes) => {
    try {
      const { data } = await updateAssistedRegistration(request.id, changes)
      setRequests((items) => items.map((item) => item.id === data.id ? data : item))
    } catch (error) { console.error('Failed to update registration request', error) }
  }
  return (
    <div className="animate-in">
      <div className="page-header"><h1 className="page-title">Assisted Registrations</h1><p className="page-subtitle">Private queue for people requesting account-creation help.</p></div>
      {requests.length === 0 ? <div className="card" style={{ padding: 40 }}>No assisted registration requests.</div> : <div style={{ display: 'grid', gap: 16 }}>{requests.map((request) => (
        <div key={request.id} className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><h2 style={{ fontSize: 18 }}>{request.full_name}</h2><div style={{ color: '#5a4f7a' }}>{request.phone_number} · {request.preferred_language}</div><div style={{ fontSize: 13, color: '#9488b8', marginTop: 6 }}>Callback: {request.preferred_callback_time} · Created {new Date(request.created_at).toLocaleString()}</div></div>
            <select className="input" style={{ width: 150 }} value={request.status} onChange={(event) => save(request, { status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
          <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}><label className="form-label">Notes</label><textarea className="input" rows="2" value={request.notes || ''} onChange={(event) => setRequests((items) => items.map((item) => item.id === request.id ? { ...item, notes: event.target.value } : item))} onBlur={(event) => save(request, { notes: event.target.value })} placeholder="Add follow-up notes" /></div>
        </div>
      ))}</div>}
    </div>
  )
}
