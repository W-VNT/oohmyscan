import { useState } from 'react'
import { useUsers, useUpdateUser, useOperatorStats, useInviteUser, type Profile } from '@/hooks/admin/useUsers'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/shared/Toast'
import { Users, Loader2, UserPlus, PanelTop, Camera } from 'lucide-react'

export function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const { data: stats } = useOperatorStats()
  const updateUser = useUpdateUser()
  const inviteUser = useInviteUser()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'operator'>('operator')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  // Invite form
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'operator'>('operator')
  const [inviting, setInviting] = useState(false)

  function getStats(userId: string) {
    return stats?.find((s) => s.user_id === userId)
  }

  function openEdit(user: Profile) {
    setEditingUser(user)
    setFullName(user.full_name)
    setRole(user.role)
    setPhone(user.phone ?? '')
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!editingUser || !fullName.trim()) {
      toast('Le nom est requis', 'error')
      return
    }
    setSaving(true)
    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        full_name: fullName.trim(),
        role,
        phone: phone.trim() || null,
      })
      toast('Utilisateur mis à jour')
      setSheetOpen(false)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: Profile) {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        is_active: !user.is_active,
      })
      toast(user.is_active ? 'Utilisateur désactivé' : 'Utilisateur réactivé')
    } catch {
      toast('Erreur', 'error')
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast('Email et nom requis', 'error')
      return
    }
    setInviting(true)
    try {
      await inviteUser.mutateAsync({
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        role: inviteRole,
      })
      toast('Invitation envoyée')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('operator')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de l\'invitation', 'error')
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
        <h1 className="text-xl font-semibold">Utilisateurs</h1>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-1.5 size-4" />
          Inviter
        </Button>
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
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!users || users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 size-8" />
                      Aucun utilisateur
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const userStats = getStats(user.id)
                    return (
                      <tr
                        key={user.id}
                        onClick={() => openEdit(user)}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${!user.is_active ? 'opacity-50' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium">{user.full_name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Admin' : 'Opérateur'}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {user.phone || '—'}
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
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                          {userStats?.last_activity
                            ? new Date(userStats.last_activity).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
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
        {users?.length ?? 0} utilisateur{(users?.length ?? 0) !== 1 ? 's' : ''}
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
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'operator')}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="operator">Opérateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                type="tel"
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
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jean@example.com"
                type="email"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nom complet *</label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jean Dupont"
                className="text-sm"
              />
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
              Un email d'invitation sera envoyé à l'adresse indiquée.
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
