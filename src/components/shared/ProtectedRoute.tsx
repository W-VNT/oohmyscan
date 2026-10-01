import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from './LoadingScreen'
import type { UserRole } from '@/lib/constants'

interface ProtectedRouteProps {
  role?: UserRole
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Wait for profile to load before checking role
  if (!profile) {
    return <LoadingScreen />
  }

  // Admin can access everything; others must match required role and are
  // sent back to their own space otherwise.
  if (role && profile.role !== 'admin' && profile.role !== role) {
    return <Navigate to={profile.role === 'commercial' ? '/commercial' : '/app'} replace />
  }

  return <Outlet />
}
