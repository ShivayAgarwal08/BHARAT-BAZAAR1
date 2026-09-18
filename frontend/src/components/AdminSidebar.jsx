import { NavLink, useNavigate } from 'react-router-dom'
import { MdDashboard, MdGroup, MdLogout, MdPeople, MdPhone } from 'react-icons/md'

export default function AdminSidebar() {
  const navigate = useNavigate()
  const logout = () => {
    localStorage.removeItem('vl_token')
    localStorage.removeItem('vl_user')
    navigate('/')
  }
  const items = [
    { to: '/admin', label: 'Dashboard', icon: <MdDashboard /> },
    { to: '/admin/assisted-registrations', label: 'Assisted Registrations', icon: <MdPhone /> },
    { to: '/admin/artisans', label: 'Artisans', icon: <MdPeople /> },
    { to: '/admin/students', label: 'Students', icon: <MdGroup /> },
  ]
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">BB</div>
      {items.map((item) => <NavLink key={item.to} to={item.to} title={item.label} end={item.to === '/admin'} className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>{item.icon}</NavLink>)}
      <div className="sidebar-bottom"><button className="sidebar-item" onClick={logout} title="Logout" style={{ color: '#ef4444' }}><MdLogout /></button></div>
    </nav>
  )
}
