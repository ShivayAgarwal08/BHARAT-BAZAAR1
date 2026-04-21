import { useState, useEffect } from 'react'
import { getAlerts } from '../api/manager'
import { MdMessage, MdPerson } from 'react-icons/md'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data } = await getAlerts()
        setAlerts(data)
      } catch (err) {
        console.error('Failed to fetch alerts', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading alerts...</div>
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Intern Messages</h1>
        <p className="page-subtitle">See messages from interns who want to help manage your products.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📩</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No messages yet</h3>
          <p style={{ color: '#5a4f7a' }}>When interns apply to your products, their messages will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {alerts.map((alert) => (
            <div key={alert.id} className="card" style={{ padding: 24, borderLeft: '4px solid #6c3fcf' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: '50%', background: '#f3f0ff', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6c3fcf', fontSize: 24, flexShrink: 0
                }}>
                  <MdPerson />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{alert.intern.name}</div>
                    <div style={{ fontSize: 12, color: '#9488b8' }}>{new Date(alert.created_at).toLocaleString()}</div>
                  </div>
                  
                  {alert.product_id && (
                     <div style={{ fontSize: 13, color: '#6c3fcf', fontWeight: 600, marginBottom: 12 }}>
                       Regarding Product ID: #{alert.product_id}
                     </div>
                  )}

                  <div style={{ 
                    background: '#f8f9fa', padding: 16, borderRadius: 12, 
                    color: '#2d3748', fontSize: 15, lineHeight: 1.5,
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    <MdMessage style={{ verticalAlign: 'middle', marginRight: 8, color: '#9488b8' }}/>
                    "{alert.message}"
                  </div>
                  
                  <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => window.location.href = `mailto:${alert.intern.email}`}>
                      Email Intern
                    </button>
                    {alert.intern.phone_number && (
                      <button className="btn btn-ghost btn-sm">
                        Call: {alert.intern.phone_number}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
