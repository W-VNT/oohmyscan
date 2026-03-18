import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useClients, useCreateClient, useUpdateClient, type Client } from '@/hooks/admin/useClients'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/shared/Toast'
import { EmptyState } from '@/components/shared/EmptyState'
import { Building2, Plus, Search, Loader2, Filter, ArrowUpDown, Megaphone, SearchCheck } from 'lucide-react'

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

type SortOption = 'name' | 'city' | 'newest' | 'oldest'
type StatusFilter = 'all' | 'active' | 'inactive'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Nom A-Z' },
  { value: 'city', label: 'Ville' },
  { value: 'newest', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
]

export function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortOption>('name')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ClientForm, string>>>({})
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)
  const [siretLoading, setSiretLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Campaign counts per client
  const { data: campaignCounts = new Map<string, number>() } = useQuery({
    queryKey: ['client-campaign-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('client_id')
      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        if (row.client_id) {
          counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1)
        }
      }
      return counts
    },
    staleTime: 5 * 60 * 1000,
  })

  // Debounce search
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

  async function lookupSiret() {
    const raw = form.siret?.replace(/\s/g, '')
    if (!raw || raw.length !== 14) {
      setFormErrors((prev) => ({ ...prev, siret: 'Le SIRET doit contenir 14 chiffres' }))
      return
    }
    setSiretLoading(true)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${raw}&page=1&per_page=1`)
      if (!res.ok) throw new Error('API indisponible')
      const json = await res.json()
      const company = json.results?.[0]
      if (!company) {
        setFormErrors((prev) => ({ ...prev, siret: 'Aucune entreprise trouvée' }))
        return
      }
      const siege = company.siege
      // Compute TVA intra from SIREN if API doesn't provide it
      let tva = company.numero_tva_intra || null
      if (!tva && raw.length >= 9) {
        const siren = parseInt(raw.slice(0, 9), 10)
        if (!isNaN(siren)) {
          const key = (12 + 3 * (siren % 97)) % 97
          tva = `FR${String(key).padStart(2, '0')}${raw.slice(0, 9)}`
        }
      }
      setForm((f) => ({
        ...f,
        company_name: company.nom_complet || f.company_name,
        address: siege?.adresse ? `${siege.numero_voie ?? ''} ${siege.type_voie ?? ''} ${siege.libelle_voie ?? ''}`.trim() : f.address,
        city: siege?.libelle_commune || f.city,
        postal_code: siege?.code_postal || f.postal_code,
        tva_number: tva || f.tva_number,
      }))
      setFormErrors((prev) => { const next = { ...prev }; delete next.siret; return next })
      toast('Informations entreprise importées')
    } catch {
      setFormErrors((prev) => ({ ...prev, siret: 'Erreur lors de la recherche' }))
    } finally {
      setSiretLoading(false)
    }
  }

  // Status counts
  const statusCounts = useMemo(() => {
    if (!clients) return { active: 0, inactive: 0 }
    return {
      active: clients.filter((c) => c.is_active).length,
      inactive: clients.filter((c) => !c.is_active).length,
    }
  }, [clients])

  // Filter + search + sort
  const filtered = useMemo(() => {
    if (!clients) return []
    let result = clients

    if (statusFilter === 'active') result = result.filter((c) => c.is_active)
    if (statusFilter === 'inactive') result = result.filter((c) => !c.is_active)

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.contact_name?.toLowerCase().includes(q) ||
          c.contact_email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q),
      )
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name': return a.company_name.localeCompare(b.company_name, 'fr')
        case 'city': return (a.city ?? '').localeCompare(b.city ?? '', 'fr')
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        default: return 0
      }
    })

    return result
  }, [clients, statusFilter, debouncedSearch, sort])

  function openCreate() {
    setEditingClient(null)
    setForm(emptyForm)
    setFormErrors({})
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
    setFormErrors({})
    setSheetOpen(true)
  }

  async function handleSave() {
    const errors: Partial<Record<keyof ClientForm, string>> = {}

    if (!form.company_name.trim()) {
      errors.company_name = 'Le nom de la société est requis'
    }

    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      errors.contact_email = 'Format d\'email invalide'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
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

  function handleToggleActive(client: Client) {
    if (client.is_active) {
      setConfirmDeactivate(client.id)
    } else {
      updateClient.mutate({ id: client.id, is_active: true })
      toast('Client réactivé')
    }
  }

  function confirmToggle(client: Client) {
    updateClient.mutate({ id: client.id, is_active: false })
    setConfirmDeactivate(null)
    toast('Client désactivé')
  }

  const field = (
    key: keyof ClientForm,
    label: string,
    placeholder?: string,
    type?: string,
  ) => {
    const error = formErrors[key]
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <Input
          value={(form[key] as string) ?? ''}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value || null }))
            if (error) setFormErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
          }}
          placeholder={placeholder}
          type={type}
          className={`text-sm ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    )
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Clients</h1>
          <div className="flex gap-1.5 text-xs text-muted-foreground">
            <span>{statusCounts.active} actif{statusCounts.active !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{statusCounts.inactive} inactif{statusCounts.inactive !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 size-4" />
          Nouveau client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom, contact, email, ville..."
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            <option value="all">Tous ({clients?.length ?? 0})</option>
            <option value="active">Actifs ({statusCounts.active})</option>
            <option value="inactive">Inactifs ({statusCounts.inactive})</option>
          </select>
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background pl-10 pr-8 py-2 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
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
                    <td colSpan={6}>
                      <EmptyState
                        icon={Building2}
                        title={debouncedSearch || statusFilter !== 'all' ? 'Aucun client trouvé' : 'Aucun client pour le moment'}
                        action={!debouncedSearch && statusFilter === 'all' ? { label: 'Nouveau client', onClick: openCreate } : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => {
                    const campCount = campaignCounts.get(client.id) ?? 0
                    return (
                      <tr
                        key={client.id}
                        onClick={() => openEdit(client)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{client.company_name}</span>
                            {campCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground" title={`${campCount} campagne${campCount !== 1 ? 's' : ''}`}>
                                <Megaphone className="size-3" />
                                {campCount}
                              </span>
                            )}
                          </div>
                          {!client.is_active && (
                            <span className="text-[10px] text-muted-foreground">Inactif</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {client.contact_name || '—'}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {client.contact_email ? (
                            <a
                              href={`mailto:${client.contact_email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline"
                            >
                              {client.contact_email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {client.contact_phone ? (
                            <a
                              href={`tel:${client.contact_phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline"
                            >
                              {client.contact_phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {client.city || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {confirmDeactivate === client.id ? (
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => confirmToggle(client)}
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
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleActive(client)
                              }}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                                client.is_active
                                  ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                                  : 'bg-gray-500/15 text-gray-500 hover:bg-gray-500/25'
                              }`}
                            >
                              {client.is_active ? 'Actif' : 'Inactif'}
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
        {filtered.length} client{filtered.length !== 1 ? 's' : ''}
        {(debouncedSearch || statusFilter !== 'all') && ` sur ${clients?.length ?? 0}`}
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">SIRET</label>
                  <div className="flex gap-2">
                    <Input
                      value={(form.siret as string) ?? ''}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, siret: e.target.value || null }))
                        if (formErrors.siret) setFormErrors((prev) => { const next = { ...prev }; delete next.siret; return next })
                      }}
                      placeholder="123 456 789 00012"
                      className={`flex-1 text-sm ${formErrors.siret ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={lookupSiret}
                      disabled={siretLoading}
                      title="Rechercher l'entreprise"
                      className="shrink-0"
                    >
                      {siretLoading ? <Loader2 className="size-4 animate-spin" /> : <SearchCheck className="size-4" />}
                    </Button>
                  </div>
                  {formErrors.siret && <p className="text-[11px] text-red-500">{formErrors.siret}</p>}
                  <p className="text-[10px] text-muted-foreground">Saisissez un SIRET et cliquez pour auto-remplir les infos entreprise</p>
                </div>
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
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
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
