import { useState, useMemo } from 'react'
import { useClients, useCreateClient, useUpdateClient, type Client } from '@/hooks/admin/useClients'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/shared/Toast'
import { Building2, Plus, Search, Loader2 } from 'lucide-react'

type ClientForm = Omit<Client, 'id' | 'created_at' | 'updated_at'>

const emptyForm: ClientForm = {
  company_name: '',
  contact_name: null,
  contact_email: null,
  contact_phone: null,
  address: null,
  city: null,
  postal_code: null,
  siret: null,
  tva_number: null,
  notes: null,
  is_active: true,
}

export function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()

  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    if (!clients) return []
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q),
    )
  }, [clients, search])

  function openCreate() {
    setEditingClient(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(client: Client) {
    setEditingClient(client)
    setForm({
      company_name: client.company_name,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      address: client.address,
      city: client.city,
      postal_code: client.postal_code,
      siret: client.siret,
      tva_number: client.tva_number,
      notes: client.notes,
      is_active: client.is_active,
    })
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!form.company_name.trim()) {
      toast('Le nom de la société est requis', 'error')
      return
    }
    setSaving(true)
    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, ...form })
        toast('Client mis à jour')
      } else {
        await createClient.mutateAsync(form)
        toast('Client créé')
      }
      setSheetOpen(false)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  function toggleActive(client: Client) {
    updateClient.mutate({ id: client.id, is_active: !client.is_active })
  }

  const field = (
    key: keyof ClientForm,
    label: string,
    placeholder?: string,
    type?: string,
  ) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        value={(form[key] as string) ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value || null }))}
        placeholder={placeholder}
        type={type}
        className="text-sm"
      />
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 size-4" />
          Nouveau client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="pl-9 text-sm"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Société</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Contact</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Email</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Téléphone</th>
                  <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Ville</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Building2 className="mx-auto mb-2 size-8" />
                      {search ? 'Aucun client trouvé' : 'Aucun client pour le moment'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => openEdit(client)}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">{client.company_name}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {client.contact_name || '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {client.contact_email || '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {client.contact_phone || '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {client.city || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleActive(client)
                          }}
                          className={`inline-block size-2.5 rounded-full transition-colors ${
                            client.is_active ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          aria-label={client.is_active ? 'Désactiver' : 'Activer'}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {filtered.length} client{filtered.length !== 1 ? 's' : ''}
        {search && ` sur ${clients?.length ?? 0}`}
      </p>

      {/* Sheet create/edit */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingClient ? 'Modifier le client' : 'Nouveau client'}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
            {/* Company */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Société</p>
              <div className="space-y-3">
                {field('company_name', 'Nom de la société *', 'ACME Corp')}
                {field('siret', 'SIRET', '123 456 789 00012')}
                {field('tva_number', 'Numéro TVA', 'FR12345678901')}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
              <div className="space-y-3">
                {field('contact_name', 'Nom du contact', 'Jean Dupont')}
                {field('contact_email', 'Email', 'jean@acme.fr', 'email')}
                {field('contact_phone', 'Téléphone', '01 23 45 67 89', 'tel')}
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adresse</p>
              <div className="space-y-3">
                {field('address', 'Adresse', '12 rue de Rivoli')}
                <div className="grid grid-cols-2 gap-3">
                  {field('city', 'Ville', 'Paris')}
                  {field('postal_code', 'Code postal', '75001')}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                placeholder="Notes internes..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              {editingClient ? 'Mettre à jour' : 'Créer le client'}
            </Button>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Annuler
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
