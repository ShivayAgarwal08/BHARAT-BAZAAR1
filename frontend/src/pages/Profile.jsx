import { useEffect, useState } from 'react'
import { operations } from '../api/operations'
import { getApiErrorMessage } from '../utils/apiError'

export default function Profile() {
  const [form, setForm] = useState(null); const [error, setError] = useState(''); const [saved, setSaved] = useState(false)
  useEffect(() => { operations.profile().then(setForm).catch(e => setError(getApiErrorMessage(e, 'Could not load profile.'))) }, [])
  if (error) return <main className="page"><h1>Profile</h1><p role="alert">{error}</p></main>
  if (!form) return <main className="page"><p>Loading profile…</p></main>
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  const save = async e => { e.preventDefault(); setSaved(false); setError(''); try { const user = await operations.updateProfile(form); setForm(user); localStorage.setItem('vl_user', JSON.stringify(user)); setSaved(true) } catch (err) { setError(getApiErrorMessage(err, 'Could not save profile.')) } }
  return <main className="page"><h1>Profile</h1><p className="muted">Keep your contact and work details current. Your role and email cannot be changed here.</p><form className="service-form" onSubmit={save}><label>Name<input name="name" value={form.name || ''} onChange={change} required /></label><label>Email<input value={form.email} readOnly /></label><label>Role<input value={form.role} readOnly /></label><label>Phone number<input name="phone_number" value={form.phone_number || ''} onChange={change} /></label><label>Location<input name="location" value={form.location || ''} onChange={change} /></label><label>Preferred language<input name="language" value={form.language || ''} onChange={change} /></label><label>About you<textarea name="bio" value={form.bio || ''} onChange={change} /></label>{form.role === 'intern' && <><label>Services / skills<textarea name="services" value={form.services || ''} onChange={change} /></label><label>Pricing (optional)<input name="pricing" value={form.pricing || ''} onChange={change} /></label></>}<button disabled={!form.name}>Save profile</button>{saved && <p role="status">Profile saved.</p>}{error && <p role="alert">{error}</p>}</form></main>
}
