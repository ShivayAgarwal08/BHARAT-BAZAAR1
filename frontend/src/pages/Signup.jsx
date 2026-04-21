import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api/auth'
import { MdPerson, MdEmail, MdLock, MdLanguage, MdArrowForward, MdPlace } from 'react-icons/md'

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 हिंदी' },
  { code: 'ta', label: '🇮🇳 தமிழ்' },
  { code: 'te', label: '🇮🇳 తెలుగు' },
  { code: 'bn', label: '🇮🇳 বাংলা' },
]

export default function Signup() {
  const navigate = useNavigate()
  const [roleMode, setRoleMode] = useState('artisan') // artisan | intern
  const [form, setForm] = useState({ 
    name: '', email: '', password: '', language: 'hi', location: '',
    phone_number: '', bio: '', services: '', pricing: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Clear error when switching tabs
  useEffect(() => setError(''), [roleMode])

  const handleSubmit = async (e, submittedRole) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form, role: submittedRole }
      const { data } = await signup(payload)
      localStorage.setItem('vl_token', data.access_token)
      localStorage.setItem('vl_user', JSON.stringify(data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderFormFields = (role) => (
    <div style={{ padding: '0 5px' }}>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: 13, marginBottom: 4 }}>Full Name</label>
        <div style={{ position: 'relative' }}>
          <MdPerson style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9488b8', fontSize: 18 }} />
          <input className="input" type="text" placeholder="Your name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required style={{ paddingLeft: 40 }} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: 13, marginBottom: 4 }}>Email Address</label>
        <div style={{ position: 'relative' }}>
          <MdEmail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9488b8', fontSize: 18 }} />
          <input className="input" type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required style={{ paddingLeft: 40 }} />
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 13, marginBottom: 4 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <MdLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9488b8', fontSize: 18 }} />
            <input className="input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required style={{ paddingLeft: 40 }} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 13, marginBottom: 4 }}>Phone Number</label>
          <input className="input" type="tel" placeholder="+91 99..." value={form.phone_number}
            onChange={e => setForm({ ...form, phone_number: e.target.value })} required />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 13, marginBottom: 4 }}><MdPlace style={{ verticalAlign: 'middle' }} /> Location</label>
          <input className="input" type="text" placeholder="Village / City" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: 13, marginBottom: 4 }}><MdLanguage style={{ verticalAlign: 'middle' }} /> Language</label>
          <select className="input" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {role === 'intern' && (
        <div style={{ background: 'rgba(108,63,207,0.04)', padding: 12, borderRadius: 12, marginBottom: 20, border: '1px solid rgba(108,63,207,0.1)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6c3fcf', fontSize: 13 }}>Intern Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Top Services</label>
              <input className="input" type="text" placeholder="SEO, Marketing" value={form.services}
                onChange={e => setForm({ ...form, services: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Price Strategy</label>
              <input className="input" type="text" placeholder="10% cut" value={form.pricing}
                onChange={e => setForm({ ...form, pricing: e.target.value })} required />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Short Bio</label>
            <textarea className="input" placeholder="Why hire you?" rows="2" value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })} required></textarea>
          </div>
        </div>
      )}

      {error && roleMode === role && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 16, marginTop: 10, borderRadius: 12 }} disabled={loading}>
        {loading ? 'Creating...' : <><span>Join as {role === 'artisan' ? 'Artisan' : 'Intern'}</span> <MdArrowForward /></>}
      </button>
    </div>
  )

  return (
    <>
      <style>{`
        .split-container {
          position: relative;
          width: 100%;
          max-width: 900px;
          height: 640px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          overflow: hidden;
          display: flex;
        }
        .form-pane {
          width: 50%;
          height: 100%;
          padding: 40px 30px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          transition: opacity 0.4s ease-in-out;
        }
        .overlay-pane {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          background: linear-gradient(135deg, #6c3fcf, #8b5cf6);
          z-index: 10;
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          padding: 40px;
          text-align: center;
        }
        
        .overlay-artisan-active {
          left: 50%;
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
          border-top-left-radius: 24px;
          border-bottom-left-radius: 24px;
        }
        .overlay-intern-active {
          left: 0%;
          box-shadow: 10px 0 30px rgba(0,0,0,0.1);
          border-top-right-radius: 24px;
          border-bottom-right-radius: 24px;
        }

        .mobile-tabs {
          display: none;
        }

        @media (max-width: 768px) {
          .split-container {
            display: block;
            height: auto;
            min-height: auto;
            overflow: visible;
            box-shadow: none;
            background: transparent;
            margin-top: 20px;
          }
          .form-pane {
            width: 100%;
            height: auto;
            padding: 24px;
            background: white;
            border-radius: 20px;
            display: none;
          }
          .form-pane.active-mobile {
            display: flex;
          }
          .overlay-pane {
            display: none;
          }
          .mobile-tabs {
            display: flex;
            background: rgba(255,255,255,0.5);
            padding: 4px;
            border-radius: 12px;
            margin-bottom: 20px;
          }
          .mobile-tab {
            flex: 1;
            padding: 10px;
            text-align: center;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #5a4f7a;
          }
          .mobile-tab.active {
            background: white;
            color: #6c3fcf;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f8f9fa' }}>
        
        <div style={{ position: 'absolute', top: 20, left: 20 }}>
          <Link to="/" style={{ color: '#9488b8', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← Back to home</Link>
        </div>

        <div style={{ width: '100%', maxWidth: 900 }}>
          <div className="mobile-tabs">
            <div className={`mobile-tab ${roleMode === 'artisan' ? 'active' : ''}`} onClick={() => setRoleMode('artisan')}>Artisan</div>
            <div className={`mobile-tab ${roleMode === 'intern' ? 'active' : ''}`} onClick={() => setRoleMode('intern')}>Intern</div>
          </div>

          <div className="split-container">
            
            {/* Left Panel: Artisan Form */}
            <div className={`form-pane ${roleMode === 'artisan' ? 'active-mobile' : ''}`} style={{ 
              opacity: roleMode === 'artisan' ? 1 : 0, 
              pointerEvents: roleMode === 'artisan' ? 'auto' : 'none',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🧵</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2d3748', margin: 0 }}>Artisan Signup</h1>
                <p style={{ color: '#5a4f7a', fontSize: 13, marginTop: 4 }}>Just speak — we handle the selling.</p>
              </div>
              <form onSubmit={(e) => handleSubmit(e, 'artisan')} style={{ flex: 1 }}>
                {renderFormFields('artisan')}
              </form>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#5a4f7a' }}>
                Already registered? <Link to="/login" style={{ color: '#6c3fcf', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </div>
            </div>

            {/* Right Panel: Intern Form */}
            <div className={`form-pane ${roleMode === 'intern' ? 'active-mobile' : ''}`} style={{ 
              opacity: roleMode === 'intern' ? 1 : 0, 
              pointerEvents: roleMode === 'intern' ? 'auto' : 'none',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 2 }}>🎓</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2d3748', margin: 0 }}>Intern Signup</h1>
                <p style={{ color: '#5a4f7a', fontSize: 13, marginTop: 4 }}>Help artisans and earn</p>
              </div>
              <form onSubmit={(e) => handleSubmit(e, 'intern')} style={{ flex: 1 }}>
                {renderFormFields('intern')}
              </form>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 14, color: '#5a4f7a' }}>
                Already registered? <Link to="/login" style={{ color: '#6c3fcf', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </div>
            </div>

            {/* Sliding Overlay */}
            <div className={`overlay-pane ${roleMode === 'artisan' ? 'overlay-artisan-active' : 'overlay-intern-active'}`}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 20, margin: '0 auto 24px', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>RB</div>

              {roleMode === 'artisan' ? (
                <div style={{ opacity: 1, transition: 'opacity 0.6s ease' }}>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Are you an Intern?</h2>
                  <p style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.6, marginBottom: 32 }}>
                    Join our network of Digital Managers. Help rural artisans sell their beautiful products online, build your portfolio, and earn!
                  </p>
                  <button 
                    onClick={() => setRoleMode('intern')} 
                    type="button"
                    style={{ 
                      background: 'transparent', border: '2px solid white', color: 'white', 
                      padding: '12px 32px', fontSize: 15, fontWeight: 600, borderRadius: 30, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#6c3fcf'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'white'; }}
                  >
                    Join as Intern
                  </button>
                </div>
              ) : (
                <div style={{ opacity: 1, transition: 'opacity 0.6s ease' }}>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Are you an Artisan?</h2>
                  <p style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.6, marginBottom: 32 }}>
                    Start selling your authentic, handmade crafts to the whole world. Create voice-powered listings and find expert managers.
                  </p>
                  <button 
                    onClick={() => setRoleMode('artisan')} 
                    type="button"
                    style={{ 
                      background: 'transparent', border: '2px solid white', color: 'white', 
                      padding: '12px 32px', fontSize: 15, fontWeight: 600, borderRadius: 30, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#6c3fcf'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'white'; }}
                  >
                    Join as Artisan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
