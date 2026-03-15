import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useUsers, useUpdateUser, useOperatorStats, useInviteUser, type Profile } from '@/hooks/admin/useUsers'
import { useAppStore } from '@/store/app.store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/shared/Toast'
import { Users, Loader2, UserPlus, PanelTop, Camera, Search, Filter, ArrowUpDown } from 'lucide-react'

type RoleFilter = 'all' | 'admin' | 'operator'
type StatusFilter = 'all' | 'active' | 'inactive'
type SortOption = 'name' | 'role' | 'activity' | 'panels' | 'photos' | 'newest'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Nom A-Z' },
  { value: 'role', label: 'Rôle' },
  { value: 'activity', label: 'Dernière activité' },
  { value: 'panels', label: 'Installations' },
  { value: 'photos', label: 'Photos' },
  { value: 'newest', label: 'Plus récents' },
]

function formatRelativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const msDay = 86400000
  const days = Math.floor((now.getTime() - date.getTime()) / msDay)

  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days}j`
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`
  return date.toLocaleDateString('fr-FR')
}

export function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const { data: stats } = useOperatorStats()
  const updateUser = useUpdateUser()
  const inviteUser = useInviteUser()
  const currentUserId = useAppStore((s) => s.profile?.id)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortOption>('name')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'operator'>('operator')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'operator'>('operator')
  const [inviting, setInviting] = useState(false)

  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)

  // Debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function getStats(userId: string) {
    return stats?.find((s) => s.user_id === userId)
  }

  // Counts
  const roleCounts = useMemo(() => {
    if (!users) return { admin: 0, operator: 0, active: 0, inactive: 0 }
    return {
      admin: users.filter((u) => u.role === 'admin').length,
      operator: users.filter((u) => u.role === 'operator').length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
    }
  }, [users])

  // Filter + search + sort
  const filtered = useMemo(() => {
    if (!users) return []
    let result = users

    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter)
    if (statusFilter === 'active') result = result.filter((u) => u.is_active)
    if (statusFilter === 'inactive') result = result.filter((u) => !u.is_active)

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q),
      )
    }

    result = [...result].sort((a, b) => {
      const statsA = getStats(a.id)
      const statsB = getStats(b.id)
      switch (sort) {
        case 'name': return a.full_name.localeCompare(b.full_name, 'fr')
        case 'role': return a.role.localeCompare(b.role)
        case 'activity': {
          const dateA = statsA?.last_activity ? new Date(statsA.last_activity).getTime() : 0
          const dateB = statsB?.last_activity ? new Date(statsB.last_activity).getTime() : 0
          return dateB - dateA
        }
        case 'panels': return (statsB?.panel_count ?? 0) - (statsA?.panel_count ?? 0)
        case 'photos': return (statsB?.photo_count ?? 0) - (statsA?.photo_count ?? 0)
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default: return 0
      }
    })

    return result
  }, [users, roleFilter, statusFilter, debouncedSearch, sort, stats])

  function openEdit(user: Profile) {
    setEditingUser(user)
    setFullName(user.full_name)
    setRole(user.role)
    setPhone(user.phone ?? '')
    setEditErrors({})
    setSheetOpen(true)
  }

  async function handleSave() {
    const errors: Record<string, string> = {}
    if (!editingUser) return
    if (!fullName.trim()) {
      errors.fullName = 'Le nom est requis'
    }
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }
    setEditErrors({})
    setSaving(true)
    try {
      const updates: Partial<Profile> & { id: string } = {
        id: editingUser.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      }
      // Only include role if it actually changed (avoids unnecessary RPC call)
      if (role !== editingUser.role) {
        updates.role = role
      }
      await updateUser.mutateAsync(updates)
      toast('Utilisateur mis à jour')
      setSheetOpen(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleToggleActive(user: Profile) {
    if (user.is_active) {
      setConfirmDeactivate(user.id)
    } else {
      updateUser.mutate({ id: user.id, is_active: true })
      toast('Utilisateur réactivé')
    }
  }

  function confirmToggle(user: Profile) {
    updateUser.mutate({ id: user.id, is_active: false })
    setConfirmDeactivate(null)
    toast('Utilisateur désactivé')
  }

  async function handleInvite() {
    const errors: Record<string, string> = {}
    if (!inviteEmail.trim()) {
      errors.inviteEmail = 'L\'email est requis'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      errors.inviteEmail = 'Format d\'email invalide'
    }
    if (!inviteName.trim()) {
      errors.inviteName = 'Le nom est requis'
    }
    if (Object.keys(errors).length > 0) {
      setInviteErrors(errors)
      return
    }
    setInviteErrors({})
    setInviting(true)
    try {
      await inviteUser.mutateAsync({
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        role: inviteRole,
      })
      toast('Invitation envoyée par email')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('operator')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la création', 'error')
    } finally {
      setInviting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Utilisateurs</h1>
          <div className="flex gap-1.5 text-xs text-muted-foreground">
            <span>{roleCounts.admin} admin{roleCounts.admin !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{roleCounts.operator} opérateur{roleCounts.operator !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <Button onClick={() => { setInviteErrors({}); setInviteOpen(true) }}>
          <UserPlus className="mr-1.5 size-4" />
          Inviter
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom ou téléphone..."
            className="pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous les rôles ({users?.length ?? 0})</option>
            <option value="admin">Admins ({roleCounts.admin})</option>
            <option value="operator">Opérateurs ({roleCounts.operator})</option>
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous</option>
          <option value="active">Actifs ({roleCounts.active})</option>
          <option value="inactive">Inactifs ({roleCounts.inactive})</option>
        </select>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="flex h-10 appearance-none rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Rôle</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Téléphone</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Installations</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Photos</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Dernière activité</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Inscrit le</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 size-8" />
                      {debouncedSearch || roleFilter !== 'all' || statusFilter !== 'all' ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => {
                    const userStats = getStats(user.id)
                    return (
                      <tr
                        key={user.id}
                        onClick={() => openEdit(user)}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${!user.is_active ? 'opacity-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={`Photo de profil de ${user.full_name}`}
                                className="size-7 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Admin' : 'Opérateur'}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {user.phone ? (
                            <a
                              href={`tel:${user.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline"
                            >
                              {user.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {userStats ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <PanelTop className="size-3" />
                              {userStats.panel_count}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {userStats ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Camera className="size-3" />
                              {userStats.photo_count}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-xs md:table-cell">
                          {userStats?.last_activity ? (
                            <span className="text-muted-foreground" title={new Date(userStats.last_activity).toLocaleDateString('fr-FR')}>
                              {formatRelativeDate(userStats.last_activity)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                          {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          {confirmDeactivate === user.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => confirmToggle(user)}
                                className="rounded px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-500/10"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setConfirmDeactivate(null)}
                                className="rounded px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleActive(user) }}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                user.is_active
                                  ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                                  : 'bg-red-500/15 text-red-500 hover:bg-red-500/25'
                              }`}
                            >
                              {user.is_active ? 'Actif' : 'Inactif'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}
        {(debouncedSearch || roleFilter !== 'all' || statusFilter !== 'all') && ` sur ${users?.length ?? 0}`}
      </p>

      {/* Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Modifier l'utilisateur</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nom complet *</label>
              <Input
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (editErrors.fullName) setEditErrors((prev) => { const next = { ...prev }; delete next.fullName; return next })
                }}
                placeholder="Jean Dupont"
                className={`text-sm ${editErrors.fullName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {editErrors.fullName && <p className="text-[11px] text-red-500">{editErrors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'operator')}
                disabled={editingUser?.id === currentUserId}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="operator">Opérateur</option>
                <option value="admin">Administrateur</option>
              </select>
              {editingUser?.id === currentUserId && (
                <p className="text-[11px] text-muted-foreground">Vous ne pouvez pas modifier votre propre rôle</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="text-sm"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Mettre à jour
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite Sheet */}
      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Inviter un utilisateur</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email *</label>
              <Input
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  if (inviteErrors.inviteEmail) setInviteErrors((prev) => { const next = { ...prev }; delete next.inviteEmail; return next })
                }}
                placeholder="jean@example.com"
                type="email"
                inputMode="email"
                autoComplete="email"
                className={`text-sm ${inviteErrors.inviteEmail ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {inviteErrors.inviteEmail && <p className="text-[11px] text-red-500">{inviteErrors.inviteEmail}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nom complet *</label>
              <Input
                value={inviteName}
                onChange={(e) => {
                  setInviteName(e.target.value)
                  if (inviteErrors.inviteName) setInviteErrors((prev) => { const next = { ...prev }; delete next.inviteName; return next })
                }}
                placeholder="Jean Dupont"
                className={`text-sm ${inviteErrors.inviteName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {inviteErrors.inviteName && <p className="text-[11px] text-red-500">{inviteErrors.inviteName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rôle</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'operator')}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="operator">Opérateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              Un email d'invitation sera envoyé à l'utilisateur avec un lien pour créer son mot de passe.
            </p>

            <Button onClick={handleInvite} disabled={inviting} className="w-full">
              {inviting && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Envoyer l'invitation
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
