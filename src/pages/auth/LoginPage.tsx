import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ScanLine } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
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
        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <Input
          type="email"
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

        <Button type="submit" disabled={loading} className="h-12 w-full text-[15px]">
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
