import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/toast'
import { AuthProvider } from './context/AuthContext'
import { AssistantProvider } from './context/AssistantContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AccountPending from './pages/AccountPending'
import AssistantSelector from './pages/AssistantSelector'
import Dashboard from './pages/Dashboard'
import CallHistory from './pages/CallHistory'
import Calendars from './pages/Calendars'
import Settings from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AssistantProvider>
          <Routes>
            {/* Public routes — redirect to app if already logged in */}
            <Route path="/login" element={
              <PublicOnlyRoute><Login /></PublicOnlyRoute>
            } />
            <Route path="/signup" element={
              <PublicOnlyRoute><Signup /></PublicOnlyRoute>
            } />

            {/* Account pending — requires auth but NOT org */}
            <Route path="/account-pending" element={
              <ProtectedRoute requireOrg={false}><AccountPending /></ProtectedRoute>
            } />

            {/* Assistant selector — requires auth + org */}
            <Route path="/assistants" element={
              <ProtectedRoute><AssistantSelector /></ProtectedRoute>
            } />

            {/* Main app — requires auth + org */}
            <Route path="/" element={
              <ProtectedRoute><Layout /></ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="calls" element={<CallHistory />} />
              <Route path="calendars" element={<Calendars />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster />
        </AssistantProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App