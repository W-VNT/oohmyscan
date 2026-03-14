import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/app.store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/components/shared/Toast'
import imageCompression from 'browser-image-compression'
import {
  LogOut,
  ChevronRight,
  PanelTop,
  Megaphone,
  Phone,
  Lock,
  Loader2,
  Pencil,
  Check,
  X,
  Sun,
  Moon,
  Bell,
  User,
  Camera,
} from 'lucide-react'

export function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session, profile, signOut } = useAuth()
  const setProfile = useAppStore((s) => s.setProfile)

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

  // Last activity
  const { data: lastActivity } = useQuery({
    queryKey: ['my-last-activity', session?.user.id],
    queryFn: async () => {
      const [photoRes, assignRes] = await Promise.all([
        supabase
          .from('panel_photos')
          .select('taken_at')
          .eq('taken_by', session!.user.id)
          .order('taken_at', { ascending: false })
          .limit(1),
        supabase
          .from('panel_campaigns')
          .select('assigned_at')
          .eq('assigned_by', session!.user.id)
          .order('assigned_at', { ascending: false })
          .limit(1),
      ])
      const dates = [
        photoRes.data?.[0]?.taken_at,
        assignRes.data?.[0]?.assigned_at,
      ].filter(Boolean) as string[]
      if (!dates.length) return null
      return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    },
    enabled: !!session,
  })

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const { data: avatarUrl } = useQuery({
    queryKey: ['avatar-url', profile?.avatar_url],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile!.avatar_url!, 3600)
      if (error) throw error
      return data.signedUrl
    },
    enabled: !!profile?.avatar_url,
    staleTime: 30 * 60 * 1000,
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return

    setUploadingAvatar(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      })

      const ext = compressed.name.split('.').pop() || 'jpg'
      const path = `${session.user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { contentType: compressed.type, upsert: true })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', session.user.id)
      if (updateError) throw updateError

      if (profile) setProfile({ ...profile, avatar_url: path })
      queryClient.invalidateQueries({ queryKey: ['my-stats'] })
      toast('Photo mise à jour')
    } catch {
      toast('Erreur lors de l\'upload', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Edit name
  const [editingName, setEditingName] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)

  async function saveName() {
    if (!session || !fullName.trim()) return
    setSavingName(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', session.user.id)
    setSavingName(false)
    if (error) {
      toast('Erreur lors de la mise à jour', 'error')
    } else {
      if (profile) setProfile({ ...profile, full_name: fullName.trim() })
      toast('Nom mis à jour')
      setEditingName(false)
    }
  }

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
      if (profile) setProfile({ ...profile, phone: phone || null })
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#0A0A0A' : '#FFFFFF')
  }

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes}min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Il y a ${hours}h`
    const days = Math.floor(hours / 24)
    return `Il y a ${days}j`
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-top))] flex-col space-y-4 p-4 pb-20">
      {/* Header with theme toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Profil</h1>
        <button
          onClick={toggleTheme}
          className="flex size-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>

      {/* Avatar + name + last activity */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative shrink-0"
        >
          <Avatar className="size-14">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
            <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-foreground">
            {uploadingAvatar ? (
              <Loader2 className="size-2.5 animate-spin text-background" />
            ) : (
              <Camera className="size-2.5 text-background" />
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{profile?.full_name ?? '—'}</p>
          {lastActivity ? (
            <p className="text-[12px] text-muted-foreground">
              Dernière activité : {formatTimeAgo(lastActivity)}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">Aucune activité</p>
          )}
        </div>
      </div>

      {/* Stats — clickable */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate('/app/panels')} className="text-left">
          <Card size="sm">
            <CardContent className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                <PanelTop className="size-4" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight">{stats?.installations ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Installations</p>
              </div>
              <ChevronRight className="ml-auto size-4 text-muted-foreground/50" />
            </CardContent>
          </Card>
        </button>
        <button onClick={() => navigate('/app/panels?tab=campaigns')} className="text-left">
          <Card size="sm">
            <CardContent className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                <Megaphone className="size-4" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight">{stats?.campaigns ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Campagnes</p>
              </div>
              <ChevronRight className="ml-auto size-4 text-muted-foreground/50" />
            </CardContent>
          </Card>
        </button>
      </div>

      <Separator />

      {/* Editable info */}
      <Card>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                <User className="size-3" />
                Nom complet
              </div>
              <button
                onClick={() => {
                  setEditingName(!editingName)
                  setFullName(profile?.full_name ?? '')
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                aria-label={editingName ? 'Annuler la modification du nom' : 'Modifier le nom'}
              >
                {editingName ? <X className="size-3" /> : <Pencil className="size-3" />}
              </button>
            </div>
            {editingName ? (
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Prénom Nom"
                  className="text-[13px]"
                  maxLength={80}
                />
                <Button size="sm" onClick={saveName} disabled={savingName || !fullName.trim()}>
                  {savingName ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </Button>
              </div>
            ) : (
              <p className="mt-0.5 text-[13px]">{profile?.full_name || '—'}</p>
            )}
          </div>

          <Separator />

          {/* Phone */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                <Phone className="size-3" />
                Téléphone
              </div>
              <button
                onClick={() => {
                  setEditingPhone(!editingPhone)
                  setPhone(profile?.phone ?? '')
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                aria-label={editingPhone ? 'Annuler la modification du téléphone' : 'Modifier le téléphone'}
              >
                {editingPhone ? <X className="size-3" /> : <Pencil className="size-3" />}
              </button>
            </div>
            {editingPhone ? (
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="text-[13px]"
                  maxLength={20}
                />
                <Button size="sm" onClick={savePhone} disabled={savingPhone}>
                  {savingPhone ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </Button>
              </div>
            ) : (
              <p className="mt-0.5 text-[13px]">{profile?.phone || '—'}</p>
            )}
          </div>

          <Separator />

          {/* Password */}
          <div>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                <Lock className="size-3" />
                Mot de passe
              </div>
              <ChevronRight
                className={`size-4 text-muted-foreground transition-transform ${showPassword ? 'rotate-90' : ''}`}
              />
            </button>
            {showPassword && (
              <div className="mt-2 space-y-2">
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
                  placeholder="Confirmer"
                  className="text-[13px]"
                />
                <Button
                  size="sm"
                  onClick={changePassword}
                  disabled={savingPassword || !newPassword}
                  className="w-full"
                >
                  {savingPassword && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                  Changer le mot de passe
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications — V2 teaser */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Notifications
              </p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Bientôt
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Recevez des alertes pour les nouvelles campagnes et missions.
          </p>
        </CardContent>
      </Card>

      {/* Spacer to push logout to bottom */}
      <div className="flex-1" />

      <Separator />

      <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
        <LogOut className="size-4" />
        Se déconnecter
      </Button>
    </div>
  )
}
