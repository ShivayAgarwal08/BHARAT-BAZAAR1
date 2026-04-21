import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listProducts, getAllProducts } from '../api/product'
import { getInvitations, updateInvitationStatus, sendAlert } from '../api/manager'
import { MdAdd, MdTrendingUp, MdSell, MdPeople, MdSchool, MdRocketLaunch, MdCheckCircle } from 'react-icons/md'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('vl_user') || '{}')
  const isIntern = user.role === 'intern'

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isIntern) {
          // Intern sees products they can manage and their incoming invitations
          const [prodRes, invRes] = await Promise.all([
             getAllProducts(),
             getInvitations()
          ])
          setAllProducts(prodRes.data)
          setInvitations(invRes.data)
        } else {
          // Artisan sees their own products and sent invitations
          const [prodRes, invRes] = await Promise.all([
             listProducts(),
             getInvitations()
          ])
          setProducts(prodRes.data)
          setInvitations(invRes.data)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isIntern])

  const totalValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0)
  const acceptedTeam = invitations.filter(inv => inv.status === 'accepted')

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateInvitationStatus(id, { status: newStatus })
      const { data } = await getInvitations()
      setInvitations(data)
    } catch (err) {
      alert("Failed to update status")
    }
  }

  const handleApply = async (product) => {
    const message = prompt(`Send a message to ${product.owner?.name || 'the Artisan'}:`)
    if (!message) return
    
    try {
      await sendAlert({
        artisan_id: product.user_id,
        product_id: product.id,
        message: message
      })
      alert("Message sent to Artisan!")
    } catch (err) {
      alert("Failed to send message")
      console.error(err)
    }
  }

  // Artisan Dashboard View
  const ArtisanDashboard = () => (
    <>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Hi {(user.name || 'there').split(' ')[0]}, Ready to<br /><span>Grow Your Business?</span></h1>
          <p className="page-subtitle">Your artisan products are making a difference. Check your progress below.</p>
        </div>
        <div className="ai-avatar">
          <div className="float" style={{ fontSize: 80 }}>🤖</div>
          <div className="ai-bubble">Namaste! 👋<br />I analyzed your latest sales!</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#f3f0ff', color: '#6c3fcf' }}><MdSell /></div>
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><MdTrendingUp /></div>
          <div className="stat-value">₹{totalValue.toLocaleString()}</div>
          <div className="stat-label">Stock Value</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><MdPeople /></div>
          <div className="stat-value">{acceptedTeam.length}</div>
          <div className="stat-label">Hired Experts</div>
        </div>
      </div>

      {invitations.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Team & Hiring Requests</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {invitations.map(inv => (
              <div key={inv.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: inv.status === 'accepted' ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{inv.intern.name} <span style={{ fontSize: 13, color: '#6c3fcf', fontWeight: 600 }}>({inv.intern.services})</span></div>
                  <div style={{ fontSize: 13, color: '#5a4f7a', margin: '4px 0' }}>Request: "{inv.message}"</div>
                  <div style={{ fontSize: 12, color: '#9488b8' }}>Sent on {new Date(inv.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {inv.status === 'accepted' ? (
                    <div>
                      <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14, marginBottom: 4 }}><MdCheckCircle style={{ verticalAlign: 'middle' }}/> Hired</div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>📞 {inv.intern.phone_number || 'No phone provided'}</div>
                    </div>
                  ) : inv.status === 'rejected' ? (
                    <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>Declined</div>
                  ) : (
                    <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>Pending Reply...</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Your Products</h2>
        <Link to="/create" className="btn btn-primary btn-sm">
          <MdAdd /> Add New Product
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading your crafts...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧵</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No products listed yet</h3>
          <p style={{ color: '#5a4f7a', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Start by adding your first product. You can just speak about it in your local language!
          </p>
          <Link to="/create" className="btn btn-primary">Add Your First Product</Link>
        </div>
      ) : (
        <div className="feature-grid">
          {products.map(product => (
            <Link key={product.id} to={`/listing/${product.id}`} className="card" style={{ padding: 20, textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                height: 160, background: '#f8f9fa', borderRadius: 12, marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                {product.category === 'handloom' ? '🧣' : product.category === 'pottery' ? '🏺' : '📦'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{product.title}</h3>
                <span className="tag">{product.category}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#6c3fcf' }}>₹{product.price}</div>
              <div style={{ fontSize: 12, color: '#9488b8', marginTop: 4 }}>Qty: {product.quantity} units</div>
            </Link>
          ))}
        </div>
      )}
    </>
  )

  // Intern Dashboard View
  const InternDashboard = () => (
    <>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Welcome Back, {(user.name || 'there').split(' ')[0]}!<br /><span>Your Impact Portfolio</span></h1>
          <p className="page-subtitle">Helping rural artisans reach global markets. Here is your management stats.</p>
        </div>
        <div className="ai-avatar">
          <div className="float" style={{ fontSize: 80 }}>👨🏽‍💻</div>
          <div className="ai-bubble">Ready to find<br />new opportunities?</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#f3f0ff', color: '#6c3fcf' }}><MdSchool /></div>
          <div className="stat-value">120</div>
          <div className="stat-label">Learning Credits</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><MdRocketLaunch /></div>
          <div className="stat-value">{invitations.length}</div>
          <div className="stat-label">Hiring Requests</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><MdSell /></div>
          <div className="stat-value">{acceptedTeam.length}</div>
          <div className="stat-label">Active Clients</div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Job Invitations</h2>
        {invitations.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: '#5a4f7a' }}>
            No hiring requests yet. Make sure your profile bio stands out!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {invitations.map(inv => (
              <div key={inv.id} className="card" style={{ padding: 20, borderLeft: inv.status === 'accepted' ? '4px solid #10b981' : '4px solid #6c3fcf' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>Artisan: {inv.artisan.name}</div>
                    {inv.product_id && <div style={{ fontSize: 13, color: '#6c3fcf', fontWeight: 600, margin: '4px 0' }}>For Product ID: #{inv.product_id}</div>}
                    <div style={{ fontSize: 14, color: '#2d3748', margin: '12px 0', background: '#f8f9fa', padding: 12, borderRadius: 8 }}>"{inv.message}"</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {inv.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(inv.id, 'accepted')}>Accept</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateStatus(inv.id, 'rejected')} style={{ color: '#ef4444' }}>Decline</button>
                      </div>
                    ) : inv.status === 'accepted' ? (
                      <div>
                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14, marginBottom: 8 }}><MdCheckCircle style={{ verticalAlign: 'middle' }}/> Accepted</div>
                        <div style={{ fontSize: 12, color: '#5a4f7a' }}>Contact Artisan:</div>
                        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>📞 {inv.artisan.phone_number || 'No phone provided'}</div>
                      </div>
                    ) : (
                      <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>Declined</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Recommended Opportunities</h2>
        <Link to="/marketplace" className="btn btn-primary btn-sm">
          Browse All
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Finding top opportunities...</div>
      ) : allProducts.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No products available</h3>
          <p style={{ color: '#5a4f7a' }}>Check back later when artisans list new products.</p>
        </div>
      ) : (
        <div className="feature-grid">
          {allProducts.slice(0, 3).map(product => (
            <div key={product.id} className="card" style={{ padding: 20 }}>
              <div style={{ 
                height: 140, background: '#f8f9fa', borderRadius: 12, marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40
              }}>
                {product.category === 'handloom' ? '🧣' : '📦'}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{product.title}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>₹{product.profit_margin}/unit</div>
                <button onClick={() => handleApply(product)} className="btn btn-ghost btn-sm">Apply</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div className="animate-in">
      {isIntern ? <InternDashboard /> : <ArtisanDashboard />}
      
      {!isIntern && (
        <div style={{ marginTop: 40 }}>
          <div className="ai-bar">
            <span style={{ fontSize: 18, color: '#9488b8' }}>+</span>
            <input className="ai-bar-input" placeholder='Example: "नीला हाथ से बुना दुपट्टा, 10 पीस" — describe your product' readOnly />
            <button className="ai-action-btn" onClick={() => (window.location.href = '/create')}>
              <MdAdd /> Quick Add
            </button>
          </div>
          <div className="ai-bar-chips">
            <button className="ai-chip" onClick={() => (window.location.href = '/create')}>🧣 Handloom</button>
            <button className="ai-chip" onClick={() => (window.location.href = '/create')}>🏺 Pottery</button>
            <button className="ai-chip" onClick={() => (window.location.href = '/create')}>💍 Jewelry</button>
          </div>
        </div>
      )}
    </div>
  )
}
