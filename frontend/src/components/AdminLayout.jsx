import { Suspense } from 'react'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="app-layout">
      <AdminSidebar />
      <div className="main-content"><Suspense fallback={<div style={{ padding: 40 }}>Loading admin area...</div>}>{children}</Suspense></div>
    </div>
  )
}
