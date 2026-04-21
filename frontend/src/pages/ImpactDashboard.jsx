import { useState, useEffect } from 'react'
import { getImpactStats } from '../api/impact'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { MdTrendingUp, MdPeople, MdSell, MdPublic } from 'react-icons/md'

const COLORS = ['#6c3fcf', '#10b981', '#f59e0b', '#3b82f6'];

const SAMPLE_TREND = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 5000 },
  { name: 'Apr', revenue: 8000 },
  { name: 'May', revenue: 9500 },
  { name: 'Jun', revenue: 12000 },
];

export default function ImpactDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await getImpactStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch stats', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}>Loading impact data...</div>
  if (!stats) return (
    <div className="animate-in" style={{ textAlign: 'center', padding: 100 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Impact data unavailable</h3>
      <p style={{ color: '#5a4f7a' }}>Could not load impact statistics. Please try again later.</p>
    </div>
  )

  const pieData = [
    { name: 'Artisans', value: stats.total_artisans || 0 },
    { name: 'Interns', value: stats.total_interns || 0 },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Impact Dashboard</h1>
        <p className="page-subtitle">Visualizing the social and economic change driven by RuralBazaar.</p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#f3f0ff', color: '#6c3fcf' }}><MdPeople /></div>
          <div className="stat-value">{stats.total_artisans}</div>
          <div className="stat-label">Artisans Onboarded</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><MdSell /></div>
          <div className="stat-value">{stats.total_products}</div>
          <div className="stat-label">Products Listed</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><MdTrendingUp /></div>
          <div className="stat-value">₹{(stats.revenue_generated || 0).toLocaleString()}</div>
          <div className="stat-label">Revenue Generated</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><MdPublic /></div>
          <div className="stat-value">{stats.jobs_created}</div>
          <div className="stat-label">Jobs Created</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Cumulative Revenue Trend (₹)</h3>
          <div style={{ height: 300 }}>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SAMPLE_TREND}>
                   <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#6c3fcf" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#6c3fcf" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9488b8' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9488b8' }} />
                   <Tooltip />
                   <Area type="monotone" dataKey="revenue" stroke="#6c3fcf" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Community Split</h3>
          <div style={{ height: 260 }}>
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                   >
                      {pieData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Pie>
                   <Tooltip />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5a4f7a' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6c3fcf' }}></div> Artisans
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5a4f7a' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></div> Interns
             </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 32, marginTop: 24, background: 'linear-gradient(135deg, #6c3fcf, #8b5cf6)', color: 'white' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ fontSize: 48 }}>🌍</div>
            <div>
               <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Global Reach</h3>
               <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                  RuralBazaar has touched 142 villages across 12 states. We are on a mission to bring ₹100 Crores of rural revenue into the digital economy by 2026.
                </p>
            </div>
         </div>
      </div>
    </div>
  )
}
