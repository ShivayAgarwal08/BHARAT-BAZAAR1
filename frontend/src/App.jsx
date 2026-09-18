import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import AdminLayout from './components/AdminLayout'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const VoiceCreator = lazy(() => import('./pages/VoiceCreator'))
const ListingPage = lazy(() => import('./pages/ListingPage'))
const ManagerMarketplace = lazy(() => import('./pages/ManagerMarketplace'))
const ImpactDashboard = lazy(() => import('./pages/ImpactDashboard'))
const Alerts = lazy(() => import('./pages/Alerts'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminAssistedRegistrations = lazy(() => import('./pages/AdminAssistedRegistrations'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('vl_user') || '{}') } catch { return {} }
}

function UserRoute({ children }) {
  const token = localStorage.getItem('vl_token')
  const user = getStoredUser()
  if (!token) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  return ['artisan', 'intern'].includes(user.role) ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('vl_token')
  const user = getStoredUser()
  if (!token) return <Navigate to="/login" replace />
  return user.role === 'admin' ? children : <Navigate to="/dashboard" replace />
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading content...</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading application...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={
            <UserRoute><AppLayout><Dashboard /></AppLayout></UserRoute>
          } />
          <Route path="/create" element={
            <UserRoute><AppLayout><VoiceCreator /></AppLayout></UserRoute>
          } />
          <Route path="/listing/:id" element={
            <UserRoute><AppLayout><ListingPage /></AppLayout></UserRoute>
          } />
          <Route path="/marketplace" element={
            <UserRoute><AppLayout><ManagerMarketplace /></AppLayout></UserRoute>
          } />
          <Route path="/impact" element={
            <UserRoute><AppLayout><ImpactDashboard /></AppLayout></UserRoute>
          } />
          <Route path="/alerts" element={
            <UserRoute><AppLayout><Alerts /></AppLayout></UserRoute>
          } />
          <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
          <Route path="/admin/assisted-registrations" element={<AdminRoute><AdminLayout><AdminAssistedRegistrations /></AdminLayout></AdminRoute>} />
          <Route path="/admin/artisans" element={<AdminRoute><AdminLayout><AdminUsers role="artisan" /></AdminLayout></AdminRoute>} />
          <Route path="/admin/students" element={<AdminRoute><AdminLayout><AdminUsers role="intern" /></AdminLayout></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
