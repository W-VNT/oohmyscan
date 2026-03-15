import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ScanLine } from 'lucide-react'

const MAX_ATTEMPTS = 5
const COOLDOWN_SECONDS = 30

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

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
      // Fetch profile to determine redirect destination
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        navigate(profile?.role === 'admin' ? '/admin' : '/app/dashboard')
      } else {
        navigate('/app/dashboard')
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top spacer — push content to ~1/3 */}
      <div className="flex-1" />

      {/* Logo + branding */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-foreground">
          <ScanLine className="size-7 text-background" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">OOHMYSCAN</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Gestion terrain OOH</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {lockedUntil && cooldownRemaining > 0 ? (
          <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
            Trop de tentatives. Réessayez dans {cooldownRemaining} seconde{cooldownRemaining > 1 ? 's' : ''}.
          </div>
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
            {error}
          </div>
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
            <>
              <Loader2 className="size-4 animate-spin" />
              Connexion...
            </>
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>

      {/* Bottom spacer + version */}
      <div className="flex-[2]" />
      <p className="pb-4 text-center text-[11px] text-muted-foreground">v1.0.0</p>
    </div>
  )
}
