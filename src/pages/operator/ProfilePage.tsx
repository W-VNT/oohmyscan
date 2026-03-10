import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/components/shared/Toast'
import {
  LogOut,
  Shield,
  ChevronRight,
  PanelTop,
  Megaphone,
  Calendar,
  Phone,
  Lock,
  Loader2,
  Pencil,
  X,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProfilePage() {
  const { session, profile, signOut, isAdmin } = useAuth()

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['my-stats', session?.user.id],
    queryFn: async () => {
      const [panelsRes, assignRes] = await Promise.all([
        supabase
          .from('panels')
          .select('id', { count: 'exact', head: true })
          .eq('installed_by', session!.user.id),
        supabase
          .from('panel_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_by', session!.user.id),
      ])
      return {
        installations: panelsRes.count ?? 0,
        campaigns: assignRes.count ?? 0,
      }
    },
    enabled: !!session,
  })

  // Edit phone
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [savingPhone, setSavingPhone] = useState(false)

  async function savePhone() {
    if (!session) return
    setSavingPhone(true)
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone || null })
      .eq('id', session.user.id)
    setSavingPhone(false)
    if (error) {
      toast('Erreur lors de la mise à jour', 'error')
    } else {
      toast('Téléphone mis à jour')
      setEditingPhone(false)
    }
  }

  // Change password
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function changePassword() {
    if (newPassword.length < 6) {
      toast('6 caractères minimum', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('Les mots de passe ne correspondent pas', 'error')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Mot de passe modifié')
      setShowPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  // Theme
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-4 p-4 pb-20">
      <h1 className="text-lg font-semibold tracking-tight">Profil</h1>

      {/* Identity */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.full_name ?? '—'}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="size-3" />
                <span>{profile?.role === 'admin' ? 'Administrateur' : 'Opérateur'}</span>
              </div>
              {memberSince && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="size-3" />
                  <span>Membre depuis {memberSince}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card size="sm">
          <CardContent className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
              <PanelTop className="size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">{stats?.installations ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Installations</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
              <Megaphone className="size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">{stats?.campaigns ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Campagnes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Phone */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Téléphone
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPhone(!editingPhone)
                setPhone(profile?.phone ?? '')
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {editingPhone ? <X className="size-3" /> : <Pencil className="size-3" />}
              {editingPhone ? 'Annuler' : 'Modifier'}
            </button>
          </div>
          {editingPhone ? (
            <div className="mt-2 flex gap-2">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="text-[13px]"
                type="tel"
              />
              <Button size="sm" onClick={savePhone} disabled={savingPhone}>
                {savingPhone ? <Loader2 className="size-3.5 animate-spin" /> : 'OK'}
              </Button>
            </div>
          ) : (
            <p className="mt-1 text-sm">{profile?.phone || '—'}</p>
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardContent>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Lock className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Mot de passe
              </p>
            </div>
            <ChevronRight
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                showPassword && 'rotate-90'
              )}
            />
          </button>
          {showPassword && (
            <div className="mt-3 space-y-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="text-[13px]"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="text-[13px]"
              />
              <Button
                size="sm"
                onClick={changePassword}
                disabled={savingPassword || !newPassword}
                className="w-full"
              >
                {savingPassword ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : null}
                Changer le mot de passe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theme toggle */}
      <Card>
        <CardContent>
          <button onClick={toggleTheme} className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon className="size-3.5 text-muted-foreground" />
              ) : (
                <Sun className="size-3.5 text-muted-foreground" />
              )}
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Thème
              </p>
            </div>
            <span className="text-sm">{isDark ? 'Sombre' : 'Clair'}</span>
          </button>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Separator />
          <a
            href="/admin"
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')}
          >
            Panneau admin
            <ChevronRight className="size-4 text-muted-foreground" />
          </a>
        </>
      )}

      <Separator />

      <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
        <LogOut className="size-4" />
        Se déconnecter
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">OOHMYSCAN v1.0.0</p>
    </div>
  )
}
