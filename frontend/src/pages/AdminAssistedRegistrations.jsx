import { useEffect, useState } from 'react'
import { createAssistedArtisan, listAssistedRegistrations, updateAssistedRegistration } from '../api/admin'
import { getApiErrorMessage } from '../utils/apiError'

const statuses = ['pending', 'contacted', 'completed', 'cancelled']

const accountFormFor = (request) => ({
  name: request.full_name || '', email: '', password: '', phone_number: request.phone_number || '',
  location: '', language: request.preferred_language || 'en',
})

export default function AdminAssistedRegistrations() {
  const [requests, setRequests] = useState([])
  const [activeRequest, setActiveRequest] = useState(null)
  const [accountForm, setAccountForm] = useState(null)
  const [accountError, setAccountError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)

  useEffect(() => {
    let active = true
    listAssistedRegistrations().then(({ data }) => { if (active) setRequests(data) }).catch((error) => console.error('Failed to load registration requests', error))
    return () => { active = false }
  }, [])

  const save = async (request, changes) => {
    try {
      const { data } = await updateAssistedRegistration(request.id, changes)
      setRequests((items) => items.map((item) => item.id === data.id ? data : item))
    } catch (error) { console.error('Failed to update registration request', error) }
  }

  const openAccountForm = (request) => {
    setCreatedCredentials(null)
    setAccountError('')
    setActiveRequest(request)
    setAccountForm(accountFormFor(request))
  }

  const createAccount = async (event) => {
    event.preventDefault()
    setCreating(true)
    setAccountError('')
    try {
      await createAssistedArtisan(activeRequest.id, accountForm)
      setRequests((items) => items.map((item) => item.id === activeRequest.id ? { ...item, status: 'completed', notes: item.notes || 'Artisan account created by admin.' } : item))
      setCreatedCredentials({ email: accountForm.email, password: accountForm.password })
      setAccountForm(null)
    } catch (error) {
      setAccountError(getApiErrorMessage(error, 'Could not create the artisan account. Please try again.'))
    } finally { setCreating(false) }
  }

  const closeAccountPanel = () => {
    setActiveRequest(null)
    setAccountForm(null)
    setCreatedCredentials(null)
    setAccountError('')
  }

  return (
    <div className="animate-in">
      <div className="page-header"><h1 className="page-title">Assisted Registrations</h1><p className="page-subtitle">Private queue for people requesting account-creation help.</p></div>
      {requests.length === 0 ? <div className="card" style={{ padding: 40 }}>No assisted registration requests.</div> : <div style={{ display: 'grid', gap: 16 }}>{requests.map((request) => (
        <div key={request.id} className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><h2 style={{ fontSize: 18 }}>{request.full_name}</h2><div style={{ color: '#5a4f7a' }}>{request.phone_number} · {request.preferred_language}</div><div style={{ fontSize: 13, color: '#9488b8', marginTop: 6 }}>Callback: {request.preferred_callback_time} · Created {new Date(request.created_at).toLocaleString()}</div></div>
            <select className="input" style={{ width: 150 }} value={request.status} onChange={(event) => save(request, { status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
          <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}><label className="form-label">Notes</label><textarea className="input" rows="2" value={request.notes || ''} onChange={(event) => setRequests((items) => items.map((item) => item.id === request.id ? { ...item, notes: event.target.value } : item))} onBlur={(event) => save(request, { notes: event.target.value })} placeholder="Add follow-up notes" /></div>
          {request.status !== 'completed' && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => openAccountForm(request)}>Create Artisan Account</button>}
        </div>
      ))}</div>}

      {(accountForm || createdCredentials) && <div className="card" style={{ padding: 24, marginTop: 24 }}>
        {createdCredentials ? <>
          <h2 style={{ fontSize: 18 }}>Artisan account created successfully.</h2>
          <p style={{ marginTop: 12 }}>Login email: <strong>{createdCredentials.email}</strong></p>
          <p>Temporary password: <strong>{createdCredentials.password}</strong></p>
          <p style={{ color: '#b45309', marginTop: 12 }}>Share these credentials securely. The password cannot be viewed again.</p>
          <button className="btn btn-primary" onClick={closeAccountPanel}>Close</button>
        </> : <form onSubmit={createAccount}>
          <h2 style={{ fontSize: 18 }}>Create artisan account for {activeRequest.full_name}</h2>
          <p style={{ color: '#5a4f7a', margin: '8px 0 16px' }}>The temporary password is shown once after successful creation and is never sent back by the API.</p>
          {accountError && <p style={{ color: '#b42318' }}>{accountError}</p>}
          {Object.entries({ name: 'Full name', email: 'Email', password: 'Temporary password', phone_number: 'Phone number', location: 'Location', language: 'Language' }).map(([field, label]) => <div className="form-group" key={field}><label className="form-label">{label}</label><input className="input" type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'} value={accountForm[field]} onChange={(event) => setAccountForm({ ...accountForm, [field]: event.target.value })} required={field !== 'location'} /></div>)}
          <div style={{ display: 'flex', gap: 12 }}><button className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create Artisan Account'}</button><button type="button" className="btn btn-ghost" onClick={closeAccountPanel}>Cancel</button></div>
        </form>}
      </div>}
    </div>
  )
}
