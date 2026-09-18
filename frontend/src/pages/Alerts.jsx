import { useEffect, useState } from 'react'
import { getAlerts } from '../api/manager'
import { MdMessage, MdPerson } from 'react-icons/md'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('vl_user') || '{}')
  const isIntern = user.role === 'intern'

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data } = await getAlerts()
        setAlerts(data)
      } catch (error) {
        console.error('Failed to fetch alerts', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading messages...</div>

  const counterparty = (alert) => isIntern ? alert.artisan : alert.intern

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">{isIntern ? 'Sent Messages' : 'Messages from Interns'}</h1>
        <p className="page-subtitle">
          {isIntern
            ? 'This is a record of messages you sent to artisans, not a real-time inbox.'
            : 'Messages sent by interns about your products. Real-time chat is not available yet.'}
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No messages yet</h3>
          <p style={{ color: '#5a4f7a' }}>{isIntern ? 'Messages you send to artisans will appear here.' : 'Messages from interns will appear here.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {alerts.map((alert) => {
            const person = counterparty(alert)
            return (
              <div key={alert.id} className="card" style={{ padding: 24, borderLeft: '4px solid #6c3fcf' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f0ff', display: 'grid', placeItems: 'center', color: '#6c3fcf', fontSize: 24, flexShrink: 0 }}><MdPerson /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{isIntern ? 'To' : 'From'}: {person?.name || 'User'}</div>
                      <div style={{ fontSize: 12, color: '#9488b8' }}>{alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Timestamp unavailable'}</div>
                    </div>
                    {alert.product_id && <div style={{ fontSize: 13, color: '#6c3fcf', fontWeight: 600, marginBottom: 12 }}>Related product #{alert.product_id}</div>}
                    <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, color: '#2d3748', lineHeight: 1.5 }}><MdMessage style={{ verticalAlign: 'middle', marginRight: 8, color: '#9488b8' }} />{alert.message}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
