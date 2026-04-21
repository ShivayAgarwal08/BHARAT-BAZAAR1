import { Link } from 'react-router-dom'
import { MdMic, MdAutoAwesome, MdSell, MdPeople, MdTrendingUp, MdArrowForward } from 'react-icons/md'

const FEATURES = [
  {
    icon: '🎤',
    title: 'Speak in Your Language',
    desc: 'Describe your product in Hindi, Tamil, Bengali or any regional language. AI understands you.',
    label: 'Multi-language AI',
    color: '#6c3fcf',
    bg: '#f3f0ff',
  },
  {
    icon: '💡',
    title: 'AI Market Intelligence',
    desc: 'Get real-time market prices, demand forecasts, and profit margin estimates for your products.',
    label: 'Market Analysis',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    icon: '📋',
    title: 'Auto Listing Generator',
    desc: 'AI creates professional product titles, descriptions, and SEO-optimized tags instantly.',
    label: 'Smart Listings',
    color: '#10b981',
    bg: '#ecfdf5',
  },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,190,240,0.4)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6c3fcf, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14,
            boxShadow: '0 4px 12px rgba(108,63,207,0.35)'
          }}>RB</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#1a1333', letterSpacing: '-0.3px' }}>
            Rural<span style={{ color: '#6c3fcf' }}>Bazaar</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '60px 40px 40px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <div className="badge badge-purple" style={{ marginBottom: 16, fontSize: 12 }}>
            🚀 AI-Powered Rural Commerce
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 20 }}>
            Just speak —<br />
            <span style={{ background: 'linear-gradient(135deg, #6c3fcf, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              we handle the selling.
            </span>
          </h1>
          <p style={{ fontSize: 18, color: '#5a4f7a', lineHeight: 1.6, marginBottom: 32, maxWidth: 520 }}>
            RuralBazaar empowers rural artisans to list, price, and sell their handmade products using just their voice — in any regional language.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary btn-lg">
              Start as an Artisan! <MdArrowForward />
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Start as an Intern Manager! <MdArrowForward />  
            </Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: '#9488b8' }}>
            ✅ No technical skills needed &nbsp;•&nbsp; ✅ Works in 10+ languages &nbsp;•&nbsp; ✅ Completely free
          </p>
        </div>

        {/* Hero visual - AI robot with bubble */}
        <div style={{ position: 'relative', marginLeft: 40, flexShrink: 0 }}>
          <div className="float" style={{ fontSize: 120, lineHeight: 1 }}>🤖</div>
          <div style={{
            position: 'absolute', top: -10, right: -120,
            background: 'white', borderRadius: 16, padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(120,100,200,0.14)',
            border: '1px solid rgba(200,190,240,0.4)',
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
            animation: 'fadeIn 0.8s ease 0.5s both',
          }}>
            नमस्ते! 👋 Need a boost?
          </div>
          {/* Floating stat badges */}
          <div style={{
            position: 'absolute', bottom: -20, left: -80,
            background: 'white', borderRadius: 14, padding: '10px 16px',
            boxShadow: '0 4px 20px rgba(120,100,200,0.12)',
            border: '1px solid rgba(200,190,240,0.4)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#6c3fcf' }}>₹14.3L</div>
            <div style={{ fontSize: 11, color: '#9488b8' }}>Revenue Generated</div>
          </div>
        </div>
      </section>

      {/* Feature cards - matching reference UI style */}
      <section style={{ padding: '20px 40px 60px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: 28 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: f.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 24, marginBottom: 16,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#5a4f7a', lineHeight: 1.6, marginBottom: 12 }}>{f.desc}</p>
              <span style={{ fontSize: 12, color: f.color, fontWeight: 600 }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Bottom AI bar - from reference UI */}
        <div style={{ marginTop: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#9488b8' }}>✨ Try a quick search</span>
          </div>
          <div className="ai-bar" style={{ maxWidth: 680, margin: '0 auto' }}>
            <span style={{ fontSize: 18, color: '#9488b8' }}>+</span>
            <input className="ai-bar-input" placeholder='Example: "नीला हाथ से बुना दुपट्टा, 10 पीस" — describe your product' readOnly />
            <button className="ai-action-btn" onClick={() => window.location.href='/signup'}>
              <MdMic /> Analyze
            </button>
          </div>
          <div className="ai-bar-chips" style={{ justifyContent: 'center', marginTop: 12 }}>
            {['🧣 Handloom', '🏺 Pottery', '💍 Jewelry', '🌿 Organic Food', '🎨 Art'].map(c => (
              <button key={c} className="ai-chip" onClick={() => window.location.href='/signup'}>{c}</button>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '20px', color: '#9488b8', fontSize: 13, borderTop: '1px solid rgba(200,190,240,0.3)' }}>
        © 2024 RuralBazaar — Empowering Rural India 🇮🇳
      </footer>
    </div>
  )
}
