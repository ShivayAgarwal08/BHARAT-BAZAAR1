import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const VoiceCreator = lazy(() => import('./pages/VoiceCreator'))
const ListingPage = lazy(() => import('./pages/ListingPage'))
const ManagerMarketplace = lazy(() => import('./pages/ManagerMarketplace'))
const ImpactDashboard = lazy(() => import('./pages/ImpactDashboard'))
const Alerts = lazy(() => import('./pages/Alerts'))

function PrivateRoute({ children }) {
  const token = localStorage.getItem('vl_token')
  return token ? children : <Navigate to="/login" replace />
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
            <PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>
          } />
          <Route path="/create" element={
            <PrivateRoute><AppLayout><VoiceCreator /></AppLayout></PrivateRoute>
          } />
          <Route path="/listing/:id" element={
            <PrivateRoute><AppLayout><ListingPage /></AppLayout></PrivateRoute>
          } />
          <Route path="/marketplace" element={
            <PrivateRoute><AppLayout><ManagerMarketplace /></AppLayout></PrivateRoute>
          } />
          <Route path="/impact" element={
            <PrivateRoute><AppLayout><ImpactDashboard /></AppLayout></PrivateRoute>
          } />
          <Route path="/alerts" element={
            <PrivateRoute><AppLayout><Alerts /></AppLayout></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
