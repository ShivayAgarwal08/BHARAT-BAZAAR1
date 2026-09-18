import { NavLink, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdAdd, MdStorefront, MdLogout, MdMessage
} from 'react-icons/md'

export default function Sidebar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('vl_user') || '{}')

  const logout = () => {
    localStorage.removeItem('vl_token')
    localStorage.removeItem('vl_user')
    navigate('/')
  }

  const allItems = [
    { to: '/dashboard', icon: <MdDashboard />, label: 'Home' },
    { to: '/create', icon: <MdAdd />, label: 'Add Product', roles: ['artisan'] },
    { to: '/marketplace', icon: <MdStorefront />, label: user.role === 'intern' ? 'Opportunities' : 'Find a Manager' },
    { to: '/alerts', icon: <MdMessage />, label: 'Messages', roles: ['artisan', 'intern'] },
  ]

  const items = allItems.filter(item => !item.roles || item.roles.includes(user.role))

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">BB</div>

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.label}
          className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
        >
          {item.icon}
        </NavLink>
      ))}

      <div className="sidebar-bottom">
        <button
          className="sidebar-item"
          onClick={logout}
          title="Logout"
          style={{ color: '#ef4444' }}
        >
          <MdLogout />
        </button>
      </div>
    </nav>
  )
}
