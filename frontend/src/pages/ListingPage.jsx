import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProduct, deleteProduct } from '../api/product'
import { getInterns, hireIntern, getInvitations } from '../api/manager'
import { MdDelete, MdCheckCircle, MdEdit, MdContentCopy, MdPersonAdd } from 'react-icons/md'

export default function ListingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [interns, setInterns] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [hiring, setHiring] = useState(null) // intern ID currently being hired
  const user = JSON.parse(localStorage.getItem('vl_user')) || {}

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, internsRes, invRes] = await Promise.all([
          getProduct(id),
          getInterns(),
          getInvitations()
        ])
        setProduct(prodRes.data)
        setInterns(internsRes.data || [])
        setInvitations(invRes.data || [])
      } catch (err) {
        console.error('Failed to fetch data', err)
        // If they are intern, getInterns might fail or be empty, gracefully handle
        if (err.response?.status !== 403) {
          try {
             const prod = await getProduct(id);
             setProduct(prod.data);
          } catch(e) {}
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleHire = async (internId) => {
    const message = prompt("Send a brief message to this intern about your product:")
    if (message === null) return // cancelled
    
    setHiring(internId)
    try {
      await hireIntern({
        intern_id: internId,
        product_id: parseInt(id),
        message: message || `Hi, I'd like to hire you to help with my product: ${product.title}`
      })
      const { data } = await getInvitations()
      setInvitations(data)
      alert("Success! Your hiring invitation has been sent.")
    } catch (err) {
      console.error('Failed to hire intern', err)
      alert("Error: " + (err.response?.data?.detail || "Could not send invitation"))
    } finally {
      setHiring(null)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return
    try {
      await deleteProduct(id)
      navigate('/dashboard')
    } catch (err) {
      alert("Failed to delete product")
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}>Loading listing...</div>
  if (!product) return <div>Product not found</div>

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{product.title}</h1>
          <p className="page-subtitle">Created on {new Date(product.created_at).toLocaleDateString()}</p>
        </div>
        {user.role === 'artisan' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => alert("Edit feature coming soon!")}>
              <MdEdit /> Edit
            </button>
            <button className="btn btn-ghost" onClick={handleDelete} style={{ color: '#ef4444' }}>
              <MdDelete /> Delete
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'flex-start' }}>
        <div>
          <div className="card" style={{ padding: 40, marginBottom: 24 }}>
             <div style={{ 
                height: 300, background: '#f8f9fa', borderRadius: 16, marginBottom: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100,
                border: '1px solid rgba(0,0,0,0.05)', position: 'relative'
              }}>
                {product.category === 'handloom' ? '🧣' : product.category === 'pottery' ? '🏺' : '📦'}
                <div style={{ 
                  position: 'absolute', bottom: 20, right: 20, 
                  background: 'white', padding: '10px 16px', borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 700
                }}>
                  AI Optimized Visual ✨
                </div>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Product Description</h3>
              <p style={{ color: '#5a4f7a', lineHeight: 1.7, fontSize: 16, marginBottom: 24 }}>
                {product.description}
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
                {product.tags.split(',').map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', gap: 40 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#9488b8', marginBottom: 4 }}>Selling Price</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#6c3fcf' }}>₹{product.price}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#9488b8', marginBottom: 4 }}>Profit Margin</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>₹{product.profit_margin}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#9488b8', marginBottom: 4 }}>Inventory</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{product.quantity} units</div>
                </div>
              </div>
          </div>
        </div>

        <aside>
          {user.role === 'artisan' && (
            <div className="card" style={{ padding: 24, position: 'sticky', top: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Hire an Expert</h3>
              <p style={{ fontSize: 13, color: '#5a4f7a', marginBottom: 20 }}>
                Find interns who specialize in branding, marketing, and selling online to grow your sales.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {interns.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#9488b8', textAlign: 'center', padding: 20 }}>
                    No interns available right now.
                  </div>
                ) : (
                  interns.map(intern => {
                    const isInvited = invitations.some(inv => inv.intern_id === intern.id && inv.product_id === parseInt(id))
                    
                    return (
                      <div key={intern.id} style={{ 
                        border: '1px solid rgba(108,63,207,0.1)', borderRadius: 12, padding: 16,
                        background: isInvited ? '#f8f5ff' : 'white'
                      }}>
                        <div style={{ fontWeight: 700, color: '#2d3748', fontSize: 15 }}>{intern.name}</div>
                        <div style={{ fontSize: 12, color: '#6c3fcf', fontWeight: 600, margin: '4px 0 8px 0' }}>
                          {intern.services || 'Digital Marketing'}
                        </div>
                        <p style={{ fontSize: 12, color: '#5a4f7a', marginBottom: 12, lineHeight: 1.4 }}>
                          {intern.bio || 'Passionate about helping rural artisans scale their business online.'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                            {intern.pricing || 'Negotiable'}
                          </span>
                          
                          {isInvited ? (
                            <span style={{ fontSize: 12, color: '#6c3fcf', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MdCheckCircle /> Invited
                            </span>
                          ) : (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              onClick={() => handleHire(intern.id)}
                              disabled={hiring === intern.id}
                            >
                              {hiring === intern.id ? '...' : <><MdPersonAdd /> Hire</>}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="badge badge-amber" style={{ width: '100%', justifyContent: 'center', marginBottom: 16, padding: '8px' }}>
                  ⭐ Grow Your Business
                </div>
                <p style={{ fontSize: 12, color: '#9488b8', fontStyle: 'italic' }}>
                  "Hiring an intern manager helped me sell 40+ units in Mumbai last month!" — Savita, Handloom Artisan
                </p>
              </div>
            </div>
          )}
          
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}>
             <MdContentCopy /> Copy Listing Link
          </button>
        </aside>
      </div>
    </div>
  )
}
