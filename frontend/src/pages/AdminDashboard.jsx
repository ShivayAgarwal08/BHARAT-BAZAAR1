import { useEffect, useState } from 'react'
import { getAdminSummary } from '../api/admin'

const labels = [
  ['total_artisans', 'Artisans'],
  ['total_interns', 'Students'],
  ['pending_assisted_registrations', 'Pending registration requests'],
  ['total_products', 'Products'],
  ['open_manager_requests', 'Open manager requests'],
]

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  useEffect(() => { getAdminSummary().then(({ data }) => setSummary(data)).catch((error) => console.error('Failed to load admin summary', error)) }, [])
  return (
    <div className="animate-in">
      <div className="page-header"><h1 className="page-title">Admin Dashboard</h1><p className="page-subtitle">Current platform data from the database.</p></div>
      {!summary ? <div>Loading summary...</div> : <div className="stats-grid">{labels.map(([key, label]) => <div key={key} className="card stat-card"><div className="stat-value">{summary[key]}</div><div className="stat-label">{label}</div></div>)}</div>}
    </div>
  )
}
