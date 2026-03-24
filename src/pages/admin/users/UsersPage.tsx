import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useUsers, useUpdateUser, useOperatorStats, useInviteUser, type Profile } from '@/hooks/admin/useUsers'
import { useAppStore } from '@/store/app.store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/shared/Toast'
import { Users, Loader2, UserPlus, PanelTop, Camera, Search, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'

type RoleFilter = 'all' | 'admin' | 'operator'
type StatusFilter = 'all' | 'active' | 'inactive'
type SortOption = 'name' | 'role' | 'activity' | 'panels' | 'newest'

const PAGE_SIZE = 25

function formatRelativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
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
  const [page, setPage] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'operator' as 'admin' | 'operator', phone: '' })
  const [saving, setSaving] = useState(false)

  // Invite form (inline at top)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'operator'>('operator')
  const [inviting, setInviting] = useState(false)

  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(value); setPage(0) }, 300)
  }, [])

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } }, [])
  useEffect(() => { setPage(0) }, [roleFilter, statusFilter])

  function getStats(userId: string) {
    return stats?.find((s) => s.user_id === userId)
  }

  const roleCounts = useMemo(() => {
    if (!users) return { admin: 0, operator: 0, active: 0, inactive: 0 }
    return {
      admin: users.filter((u) => u.role === 'admin').length,
      operator: users.filter((u) => u.role === 'operator').length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
    }
  }, [users])

  const filtered = useMemo(() => {
    if (!users) return []
    let result = users
    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter)
    if (statusFilter === 'active') result = result.filter((u) => u.is_active)
    if (statusFilter === 'inactive') result = result.filter((u) => !u.is_active)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter((u) => u.full_name.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q))
    }
    return [...result].sort((a, b) => {
      const statsA = getStats(a.id)
      const statsB = getStats(b.id)
      switch (sort) {
        case 'name': return a.full_name.localeCompare(b.full_name, 'fr')
        case 'role': return a.role.localeCompare(b.role)
        case 'activity': return (statsB?.last_activity ? new Date(statsB.last_activity).getTime() : 0) - (statsA?.last_activity ? new Date(statsA.last_activity).getTime() : 0)
        case 'panels': return (statsB?.panel_count ?? 0) - (statsA?.panel_count ?? 0)
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default: return 0
      }
    })
  }, [users, roleFilter, statusFilter, debouncedSearch, sort, stats])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function startEdit(user: Profile) {
    setEditingId(user.id)
    setEditForm({ full_name: user.full_name, role: user.role, phone: user.phone ?? '' })
  }

  async function saveEdit(userId: string) {
    if (!editForm.full_name.trim()) { toast('Le nom est requis', 'error'); return }
    setSaving(true)
    try {
      const user = users?.find((u) => u.id === userId)
      const updates: Partial<Profile> & { id: string } = { id: userId, full_name: editForm.full_name.trim(), phone: editForm.phone.trim() || null }
      if (user && editForm.role !== user.role) updates.role = editForm.role
      await updateUser.mutateAsync(updates)
      toast('Utilisateur mis à jour')
      setEditingId(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur', 'error')
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
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) { toast("Email invalide", 'error'); return }
    if (!inviteName.trim()) { toast('Le nom est requis', 'error'); return }
    setInviting(true)
    try {
      await inviteUser.mutateAsync({ email: inviteEmail.trim(), full_name: inviteName.trim(), role: inviteRole })
      toast('Invitation envoyée par email')
      setShowInvite(false)
      setInviteEmail(''); setInviteName(''); setInviteRole('operator')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur', 'error')
    } finally {
      setInviting(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Utilisateurs</h1>
          <span className="text-sm text-muted-foreground">{users?.length ?? 0}</span>
        </div>
        <Button onClick={() => setShowInvite((v) => !v)}>
          <UserPlus className="mr-1.5 size-4" /> Inviter
        </Button>
      </div>

      {/* Invite form — inline */}
      {showInvite && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Inviter un utilisateur</p>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Email *</label>
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jean@example.com" type="email" className="text-sm" autoFocus />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Nom complet *</label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jean Dupont" className="text-sm" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Rôle</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'operator')} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="operator">Opérateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleInvite} disabled={inviting}>
                {inviting && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Envoyer l'invitation
              </Button>
              <p className="text-xs text-muted-foreground">Un email sera envoyé avec un lien pour créer son mot de passe.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Rechercher..." className="h-9 pl-9 text-sm" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="all">Tous les rôles ({users?.length ?? 0})</option>
          <option value="admin">Admins ({roleCounts.admin})</option>
          <option value="operator">Opérateurs ({roleCounts.operator})</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs ({roleCounts.active})</option>
          <option value="inactive">Inactifs ({roleCounts.inactive})</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="name">Nom A-Z</option>
          <option value="role">Rôle</option>
          <option value="activity">Activité</option>
          <option value="panels">Installations</option>
          <option value="newest">Plus récents</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Nom</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Rôle</th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground md:table-cell">Téléphone</th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground lg:table-cell">Installations</th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground lg:table-cell">Photos</th>
                <th className="hidden px-4 py-2.5 font-medium text-muted-foreground md:table-cell">Activité</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Statut</th>
                {editingId && <th className="w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 size-8" />
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                paginated.map((user) => {
                  const userStats = getStats(user.id)
                  const isEditing = editingId === user.id

                  if (isEditing) {
                    return (
                      <tr key={user.id} className="bg-muted/30">
                        <td className="px-4 py-2">
                          <Input value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && saveEdit(user.id)} />
                        </td>
                        <td className="px-4 py-2">
                          <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as 'admin' | 'operator' }))} disabled={user.id === currentUserId} className="flex h-8 rounded-lg border border-input bg-background px-2 text-sm disabled:opacity-50">
                            <option value="operator">Opérateur</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="hidden px-4 py-2 md:table-cell">
                          <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="06..." type="tel" className="h-8 text-sm" onKeyDown={(e) => e.key === 'Enter' && saveEdit(user.id)} />
                        </td>
                        <td className="hidden px-4 py-2 lg:table-cell text-muted-foreground">{userStats?.panel_count ?? '—'}</td>
                        <td className="hidden px-4 py-2 lg:table-cell text-muted-foreground">{userStats?.photo_count ?? '—'}</td>
                        <td className="hidden px-4 py-2 md:table-cell" />
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(user.id)} disabled={saving} className="rounded p-1 text-green-600 hover:bg-green-500/10"><Check className="size-4" /></button>
                            <button onClick={() => setEditingId(null)} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={user.id} onClick={() => startEdit(user)} className={`cursor-pointer transition-colors hover:bg-muted/50 ${!user.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Admin' : 'Opérateur'}
                          </Badge>
                          {user.status === 'invited' && (
                            <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                              Invité
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 md:table-cell">
                        {user.phone ? <span>{user.phone}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        {userStats ? <span className="flex items-center gap-1 text-muted-foreground"><PanelTop className="size-3" />{userStats.panel_count}</span> : '—'}
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        {userStats ? <span className="flex items-center gap-1 text-muted-foreground"><Camera className="size-3" />{userStats.photo_count}</span> : '—'}
                      </td>
                      <td className="hidden px-4 py-2.5 text-xs md:table-cell">
                        {userStats?.last_activity ? <span className="text-muted-foreground">{formatRelativeDate(userStats.last_activity)}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {confirmDeactivate === user.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => confirmToggle(user)} className="rounded px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-500/10">Confirmer</button>
                            <button onClick={() => setConfirmDeactivate(null)} className="rounded px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted">Non</button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(user) }}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${user.is_active ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25' : 'bg-red-500/15 text-red-500 hover:bg-red-500/25'}`}
                          >
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </button>
                        )}
                      </td>
                      {editingId && <td />}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
