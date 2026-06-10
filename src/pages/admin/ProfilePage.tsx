import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/app.store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'
import imageCompression from 'browser-image-compression'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/components/shared/Toast'
import { Loader2, Pencil, Check, X, User, Lock, Sun, Moon, Monitor, Camera, LogOut, Shield } from 'lucide-react'
import { applyTheme, computeIsDark } from '@/components/shared/DynamicTheme'

/** Couleur déterministe pour l'avatar fallback à partir du nom. */
function colorFromName(name: string): string {
  const palette = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-rose-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-orange-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length]
}

export function ProfilePage() {
  const { session, profile, signOut } = useAuth()
  const setProfile = useAppStore((s) => s.setProfile)
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [fullName, setFullName] = useState('')
  const [savingName, setSavingName] = useState(false)

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

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast('Format non supporté. Utilisez JPG, PNG ou WebP.', 'error')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast('Fichier trop volumineux (max 20 Mo)', 'error')
      return
    }
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
      queryClient.invalidateQueries({ queryKey: ['avatar-url'] })
      toast('Photo mise à jour')
    } catch {
      toast('Erreur lors de l\'upload', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

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

  // Theme — partage la logique avec DynamicTheme (helpers exportes)
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system'
  })

  function setTheme(t: 'light' | 'dark' | 'system') {
    setThemeState(t)
    localStorage.setItem('theme', t)
    // Sur les routes app (admin/profile), computeIsDark(false) lit le localStorage
    applyTheme(computeIsDark(false))
  }

  // Password
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function changePassword() {
    if (newPassword.length < 8) {
      toast('8 caractères minimum', 'error')
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
      toast('Erreur lors du changement de mot de passe', 'error')
    } else {
      toast('Mot de passe modifié')
      setShowPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="hidden text-xl font-semibold sm:block">Profil</h1>

      {/* Profile */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User className="size-4" />
            Profil
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative shrink-0"
            >
              <Avatar className="size-16">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                <AvatarFallback
                  className={`text-lg font-semibold text-white ${colorFromName(profile?.full_name ?? '?')}`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-background bg-foreground">
                {uploadingAvatar ? (
                  <Loader2 className="size-3 animate-spin text-background" />
                ) : (
                  <Camera className="size-3 text-background" />
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

            <div className="flex-1 space-y-1">
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Prénom Nom"
                    className="text-sm"
                    maxLength={80}
                  />
                  <Button size="sm" onClick={saveName} disabled={savingName || !fullName.trim()}>
                    {savingName ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{profile?.full_name || '—'}</p>
                  <button
                    onClick={() => { setEditingName(true); setFullName(profile?.full_name ?? '') }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              {profile?.role && (
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    profile.role === 'admin'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-500/20 dark:bg-gray-500/10 dark:text-gray-300'
                  }`}
                >
                  <Shield className="size-3" />
                  {profile.role === 'admin' ? 'Administrateur' : 'Opérateur'}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sun className="size-4" />
            Préférences
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Thème</label>
            <div className="flex gap-2">
              {([
                { value: 'light' as const, icon: Sun, label: 'Clair' },
                { value: 'dark' as const, icon: Moon, label: 'Sombre' },
                { value: 'system' as const, icon: Monitor, label: 'Système' },
              ]).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
                    theme === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="size-4" />
            Sécurité
          </div>

          {showPassword ? (
            <div className="max-w-sm space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Nouveau mot de passe</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Confirmer</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={changePassword} disabled={savingPassword || !newPassword}>
                  {savingPassword && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                  Changer le mot de passe
                </Button>
                <Button variant="outline" onClick={() => { setShowPassword(false); setNewPassword(''); setConfirmPassword('') }}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowPassword(true)}>
              Changer le mot de passe
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Compte */}
      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Déconnexion</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Se déconnecter de la session admin
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-1.5 size-3.5" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
