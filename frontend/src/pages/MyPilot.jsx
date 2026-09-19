import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { myPilots } from '../api/growth'

const date = (value) => value ? new Date(value).toLocaleDateString() : 'Not available'

export default function MyPilot() {
  const [pilots, setPilots] = useState([]); const [error, setError] = useState('')
  const user = JSON.parse(localStorage.getItem('vl_user') || '{}'); const artisan = user.role === 'artisan'
  useEffect(() => { myPilots().then(({ data }) => setPilots(Array.isArray(data) ? data : [])).catch(() => setError('Could not load pilot assignments.')) }, [])
  return <div><h1>{artisan ? 'My Manager' : 'My Artisan'}</h1>{error && <p>{error}</p>}{pilots.length === 0 ? <div className="card" style={{ padding: 32 }}><p>{artisan ? 'No sponsored pilot is active yet.' : 'No artisan is assigned to you yet.'}</p>{artisan && <Link className="btn btn-primary" to="/business-help">Get Business Help</Link>}</div> : pilots.map((pilot) => <div className="card" key={pilot.id} style={{ padding: 24, marginTop: 12 }}><h2>{pilot.request_title || 'Sponsored pilot'}</h2><p>{artisan ? `Student: ${pilot.student_name || 'Not available'}` : `Artisan: ${pilot.artisan_name || 'Not available'}`}</p><p>{artisan ? (pilot.student_services || pilot.student_bio || '') : (pilot.artisan_location || pilot.artisan_bio || '')}</p><p>{pilot.request_description || ''}</p><p>Help type: {pilot.request_help_type?.replaceAll('_', ' ') || 'Not available'}</p><p>Status: {pilot.status}</p><p>Start: {date(pilot.start_date)} · End: {date(pilot.end_date)}</p>{artisan && <><p>Sponsored by Bharat Bazaar</p><p>Artisan cost: ₹0 during this pilot</p></>}</div>)}</div>
}
