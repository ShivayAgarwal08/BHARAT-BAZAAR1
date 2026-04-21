import { useState, useEffect } from 'react'
import { listRequests, applyForManager, selectIntern, getApplications } from '../api/manager'
import { getAllProducts } from '../api/product'
import { MdTrendingUp, MdVerified, MdPerson, MdSchool, MdArrowForward } from 'react-icons/md'

export default function ManagerMarketplace() {
  const [requests, setRequests] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('browse') // 'browse' or 'applications' (for artisans)
  const user = JSON.parse(localStorage.getItem('vl_user') || '{}')
  const isIntern = user.role === 'intern'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reqRes, prodRes] = await Promise.all([
          listRequests(),
          getAllProducts()
        ])
        setRequests(reqRes.data)
        setProducts(prodRes.data)
      } catch (err) {
        console.error('Failed to fetch marketplace data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleApply = async (requestId) => {
    const coverNote = prompt("Enter a short cover note for the artisan:")
    if (!coverNote) return

    try {
      await applyForManager({
        request_id: requestId,
        cover_note: coverNote,
        college: "Global Business School",
        skills: "Digital Marketing, SEO, Social Media"
      })
      alert("Application sent successfully!")
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to apply")
    }
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Manager Marketplace</h1>
        <p className="page-subtitle">
          {isIntern 
            ? 'Find rural entrepreneurs to help and gain real-world business experience.' 
            : 'Find skilled student managers to help you grow your business.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 100 }}>Loading marketplace...</div>
          ) : requests.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
               <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
               <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No active requests</h3>
               <p style={{ color: '#5a4f7a' }}>Check back later for new opportunities.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
               {requests.map(request => {
                 const product = products.find(p => p.id === request.product_id)
                 if (!product) return null

                 return (
                   <div key={request.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ padding: 24, flex: 1 }}>
                         <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                            <div style={{ 
                               width: 64, height: 64, background: '#f3f0ff', borderRadius: 12,
                               display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32
                            }}>
                               {product.category === 'handloom' ? '🧣' : '📦'}
                            </div>
                            <div>
                               <h3 style={{ fontSize: 17, fontWeight: 800 }}>{product.title}</h3>
                               <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9488b8' }}>
                                  <MdPerson /> Artisan #{request.artisan_id}
                               </div>
                            </div>
                         </div>

                         <div style={{ background: 'var(--primary-ultra-light)', padding: '12px 16px', borderRadius: 12, marginBottom: 20 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 4 }}>Goal</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                               {request.description}
                            </div>
                         </div>

                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                               <div style={{ fontSize: 11, color: '#9488b8', marginBottom: 2 }}>Profit Margin</div>
                               <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>₹{product.profit_margin}/unit</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: 11, color: '#9488b8', marginBottom: 2 }}>Impact Score</div>
                               <div style={{ fontSize: 16, fontWeight: 800, color: '#3b82f6' }}>8.4/10</div>
                            </div>
                         </div>
                      </div>

                      <div style={{ padding: '0 24px 24px' }}>
                        {isIntern ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', justifyContent: 'center', borderRadius: 16 }}
                            onClick={() => handleApply(request.id)}
                          >
                             Apply to Manage <MdArrowForward />
                          </button>
                        ) : (
                          <div className="badge badge-purple" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                             Request is live
                          </div>
                        )}
                      </div>
                   </div>
                 )
               })}
            </div>
          )}
        </div>

        <aside style={{ width: 340 }}>
           <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Marketplace Insights</h3>
              <div style={{ marginBottom: 20 }}>
                 <div style={{ fontSize: 13, color: '#5a4f7a', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Active Interns</span>
                    <span style={{ fontWeight: 800 }}>1,248</span>
                 </div>
                 <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '70%', background: '#6c3fcf' }}></div>
                 </div>
              </div>
              <div>
                 <div style={{ fontSize: 13, color: '#5a4f7a', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Successful Matches</span>
                    <span style={{ fontWeight: 800 }}>4,821</span>
                 </div>
                 <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '85%', background: '#10b981' }}></div>
                 </div>
              </div>
           </div>

           <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #1a1333, #2a2050)', color: 'white' }}>
              <div style={{ 
                 width: 48, height: 48, background: 'rgba(255,255,255,0.1)', borderRadius: 12, 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16
              }}>🎓</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Internship Credit</h3>
              <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5, marginBottom: 20 }}>
                 Helping an artisan successfully sell their products earns you 100 Business Development credits and a Certificate of Appreciation.
              </p>
              <button className="btn btn-sm" style={{ background: 'white', color: '#1a1333', width: '100%', justifyContent: 'center' }}>
                 Read Guidelines
              </button>
           </div>
        </aside>
      </div>
    </div>
  )
}
