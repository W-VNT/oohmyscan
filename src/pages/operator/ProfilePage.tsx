import { useAuth } from '@/hooks/useAuth'
import { LogOut, User, Shield } from 'lucide-react'

export function ProfilePage() {
  const { profile, signOut, isAdmin } = useAuth()

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Profil</h1>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">{profile?.full_name ?? '—'}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              {profile?.role === 'admin' ? 'Administrateur' : 'Opérateur'}
            </div>
          </div>
        </div>

        {profile?.phone && (
          <div>
            <p className="text-xs text-muted-foreground">Téléphone</p>
            <p className="text-sm">{profile.phone}</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <a
          href="/admin"
          className="flex w-full items-center justify-center rounded-md border border-input px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          Accéder au panneau admin
        </a>
      )}

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/20"
      >
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </button>
    </div>
  )
}
