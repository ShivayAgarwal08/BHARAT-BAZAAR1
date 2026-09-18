import { useEffect, useState } from 'react'
import { listAdminArtisans, listAdminInterns } from '../api/admin'

export default function AdminUsers({ role }) {
  const [users, setUsers] = useState([])
  const isArtisan = role === 'artisan'
  useEffect(() => {
    const load = isArtisan ? listAdminArtisans : listAdminInterns
    load().then(({ data }) => setUsers(data)).catch((error) => console.error('Failed to load users', error))
  }, [isArtisan])
  return (
    <div className="animate-in">
      <div className="page-header"><h1 className="page-title">{isArtisan ? 'Artisans' : 'Students'}</h1><p className="page-subtitle">Registered {isArtisan ? 'artisan' : 'intern'} accounts.</p></div>
      {users.length === 0 ? <div className="card" style={{ padding: 40 }}>No {isArtisan ? 'artisans' : 'students'} found.</div> : <div className="card" style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>{isArtisan ? 'Products' : 'Applications'}</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.id}</td><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{new Date(user.created_at).toLocaleDateString()}</td><td>{isArtisan ? user.product_count : user.application_count}</td></tr>)}</tbody></table></div>}
    </div>
  )
}
