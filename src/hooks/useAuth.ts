import { useEffect, useRef, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/app.store'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { profile, setProfile } = useAppStore()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    setSession(null)
    setProfile(null)
    await supabase.auth.signOut()
  }

  // Inactivity timeout — reset on user interaction
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (session) signOut()
    }, INACTIVITY_TIMEOUT)
  }, [session])

  useEffect(() => {
    if (!session) return
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [session, resetTimer])

  return {
    session,
    profile,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin',
    isOperator: profile?.role === 'operator',
  }
}
