import { useAuth } from '@/hooks/useAuth'

/** Prefixe des routes back-office : '/commercial' pour un commercial, '/admin' sinon. */
export function useBasePath(): '/admin' | '/commercial' {
  const { profile } = useAuth()
  return profile?.role === 'commercial' ? '/commercial' : '/admin'
}
