import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireOrg?: boolean  // If true, redirects to account-pending if no org linked
}

/**
 * Wraps routes that require authentication.
 * 
 * - Not logged in → redirect to /login
 * - Logged in but no org linked (and requireOrg=true) → redirect to /account-pending
 * - Logged in with org → render children
 */
export function ProtectedRoute({ children, requireOrg = true }: ProtectedRouteProps) {
  const { user, isLoading, orgId } = useAuth()

  // Still checking session — show nothing (or a loading skeleton)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Authenticated but no org linked
  if (requireOrg && !orgId) {
    return <Navigate to="/account-pending" replace />
  }

  return <>{children}</>
}

/**
 * Wraps auth pages (login, signup) to redirect away if already logged in.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, orgId } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  // Already logged in — redirect to appropriate page
  if (user) {
    if (orgId) {
      return <Navigate to="/assistants" replace />
    } else {
      return <Navigate to="/account-pending" replace />
    }
  }

  return <>{children}</>
}