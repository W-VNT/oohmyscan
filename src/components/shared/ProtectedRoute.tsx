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

  // Admin can access everything
  if (role && profile?.role !== 'admin' && profile?.role !== role) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
