import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ScanLine, MapPin, BarChart3, QrCode } from 'lucide-react'

const MAX_ATTEMPTS = 5
const COOLDOWN_SECONDS = 30

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  // Invite / recovery flow
  const [mode, setMode] = useState<'login' | 'set_password'>('login')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)

  // Detect auth callback (invite or recovery) on mount
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setMode('set_password')
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('set_password')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Client-side rate limiting
  const failedAttempts = useRef(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setCooldownRemaining(0)
        failedAttempts.current = 0
      } else {
        setCooldownRemaining(remaining)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (lockedUntil && Date.now() < lockedUntil) return
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      failedAttempts.current += 1
      if (failedAttempts.current >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + COOLDOWN_SECONDS * 1000)
        setError(`Trop de tentatives. Réessayez dans ${COOLDOWN_SECONDS} secondes.`)
      } else {
        setError('Email ou mot de passe incorrect')
      }
      setLoading(false)
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Update profile status to active on first login
        await supabase.from('profiles').update({ status: 'active' } as Record<string, unknown>).eq('id', session.user.id)
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
        navigate(profile?.role === 'admin' ? '/admin' : '/app/dashboard')
      } else {
        navigate('/app/dashboard')
      }
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) { setError('8 caractères minimum'); return }
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return }

    setSettingPassword(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    if (updateErr) {
      setError(updateErr.message)
      setSettingPassword(false)
      return
    }

    // Update profile status to active
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('profiles').update({ status: 'active' } as Record<string, unknown>).eq('id', session.user.id)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      navigate(profile?.role === 'admin' ? '/admin' : '/app/dashboard')
    } else {
      setMode('login')
      setSettingPassword(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-foreground p-12 text-background">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background/10">
              <ScanLine className="size-5 text-background" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">OOH MY AD !</span>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Gérez votre parc<br />publicitaire OOH
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-background/70">
              <MapPin className="size-5 shrink-0" />
              <span className="text-[15px]">Cartographie et suivi terrain en temps réel</span>
            </div>
            <div className="flex items-center gap-3 text-background/70">
              <QrCode className="size-5 shrink-0" />
              <span className="text-[15px]">Scan QR et gestion des panneaux sur le terrain</span>
            </div>
            <div className="flex items-center gap-3 text-background/70">
              <BarChart3 className="size-5 shrink-0" />
              <span className="text-[15px]">Campagnes, devis et facturation centralisés</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-background/40">OOH MY AD ! — Plateforme de gestion OOH</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex-1" />

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-foreground lg:bg-primary">
              <ScanLine className="size-7 text-background lg:text-primary-foreground" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">OOH MY AD !</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {mode === 'set_password' ? 'Créez votre mot de passe' : 'Connexion'}
            </p>
          </div>

          {mode === 'set_password' ? (
            <form onSubmit={handleSetPassword} className="space-y-3">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">{error}</div>
              )}
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Nouveau mot de passe"
                autoComplete="new-password"
                className="h-12 text-[15px]"
                autoFocus
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                className="h-12 text-[15px]"
              />
              <Button type="submit" disabled={settingPassword} className="h-12 w-full text-[15px]">
                {settingPassword ? (
                  <><Loader2 className="size-4 animate-spin" /> Création...</>
                ) : (
                  'Créer mon mot de passe'
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">8 caractères minimum</p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {lockedUntil && cooldownRemaining > 0 ? (
                <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
                  Trop de tentatives. Réessayez dans {cooldownRemaining} seconde{cooldownRemaining > 1 ? 's' : ''}.
                </div>
              ) : error ? (
                <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">{error}</div>
              ) : null}

              <Input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                autoComplete="email"
                className="h-12 text-[15px]"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mot de passe"
                autoComplete="current-password"
                className="h-12 text-[15px]"
              />
              <Button type="submit" disabled={loading || (!!lockedUntil && Date.now() < lockedUntil)} className="h-12 w-full text-[15px]">
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /> Connexion...</>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
          )}
        </div>

        <div className="flex-[2]" />
        <p className="pb-4 text-center text-[11px] text-muted-foreground">v1.0.0</p>
      </div>
    </div>
  )
}
