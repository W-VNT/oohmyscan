import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useClient, useUpdateClient } from '@/hooks/admin/useClients'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useQuotes } from '@/hooks/admin/useQuotes'
import { useInvoices } from '@/hooks/admin/useInvoices'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/shared/Toast'
import {
  ArrowLeft, Loader2,
  Megaphone, FileText, TrendingUp, Clock, Pencil, Plus,
} from 'lucide-react'
import { CAMPAIGN_STATUS_CONFIG, QUOTE_STATUS_CONFIG, INVOICE_STATUS_CONFIG } from '@/lib/constants'
import type { CampaignStatus, QuoteStatus, InvoiceStatus } from '@/lib/constants'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

interface EditForm {
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  billing_email: string
  commercial_email: string
  address: string
  city: string
  postal_code: string
  siret: string
  tva_number: string
  notes: string
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id)
  const updateClient = useUpdateClient()
  const { data: allCampaigns } = useCampaigns()
  const { data: allQuotes } = useQuotes()
  const { data: allInvoices } = useInvoices()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    company_name: '', contact_name: '', contact_email: '', contact_phone: '',
    billing_email: '', commercial_email: '',
    address: '', city: '', postal_code: '', siret: '', tva_number: '', notes: '',
  })

  const campaigns = useMemo(
    () => allCampaigns?.filter((c) => c.client_id === id) ?? [],
    [allCampaigns, id],
  )

  const quotes = useMemo(
    () => allQuotes?.filter((q) => q.client_id === id) ?? [],
    [allQuotes, id],
  )

  const invoices = useMemo(
    () => allInvoices?.filter((inv) => inv.client_id === id) ?? [],
    [allInvoices, id],
  )

  const stats = useMemo(() => {
    const totalPaid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.total_ttc, 0)
    const totalPending = invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total_ttc, 0)
    return {
      campaignCount: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      quoteCount: quotes.length,
      invoiceCount: invoices.length,
      totalPaid,
      totalPending,
    }
  }, [campaigns, quotes, invoices])

  function openEdit() {
    if (!client) return
    setEditForm({
      company_name: client.company_name,
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      billing_email: client.billing_email || '',
      commercial_email: client.commercial_email || '',
      address: client.address || '',
      city: client.city || '',
      postal_code: client.postal_code || '',
      siret: client.siret || '',
      tva_number: client.tva_number || '',
      notes: client.notes || '',
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!client) return
    if (!editForm.company_name.trim()) {
      toast('Le nom de la société est obligatoire', 'error')
      return
    }
    setSaving(true)
    try {
      await updateClient.mutateAsync({
        id: client.id,
        company_name: editForm.company_name.trim(),
        contact_name: editForm.contact_name.trim() || null,
        contact_email: editForm.contact_email.trim() || null,
        contact_phone: editForm.contact_phone.trim() || null,
        billing_email: editForm.billing_email.trim() || null,
        commercial_email: editForm.commercial_email.trim() || null,
        address: editForm.address.trim() || null,
        city: editForm.city.trim() || null,
        postal_code: editForm.postal_code.trim() || null,
        siret: editForm.siret.trim() || null,
        tva_number: editForm.tva_number.trim() || null,
        notes: editForm.notes.trim() || null,
      })
      toast('Client mis à jour')
      setEditing(false)
    } catch {
      toast('Erreur lors de la mise à jour', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Client non trouvé</p>
        <Button variant="link" onClick={() => navigate('/admin/clients')}>
          Retour aux clients
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{client.company_name}</h1>
            {!client.is_active && (
              <Badge variant="secondary">Inactif</Badge>
            )}
          </div>
          {client.contact_name && (
            <p className="text-sm text-muted-foreground">{client.contact_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/quotes/new?client=${client.id}`)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Nouveau devis
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/invoices/new?client=${client.id}`)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Nouvelle facture
          </Button>
          {!editing && (
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="mr-1.5 size-3.5" />
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Megaphone className="size-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.campaignCount}</p>
              <p className="text-xs text-muted-foreground">
                Campagnes ({stats.activeCampaigns} actives)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
              <FileText className="size-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.quoteCount}</p>
              <p className="text-xs text-muted-foreground">Devis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="size-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-xs text-muted-foreground">CA encaissé</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Clock className="size-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info client — full width */}
      <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informations
            </h2>

            {editing ? (
              <div className="space-y-4">
                {/* Row 1: Société / SIRET / TVA */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Société *</label>
                    <Input
                      value={editForm.company_name}
                      onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                      placeholder="Nom de la société"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">SIRET</label>
                    <Input
                      value={editForm.siret}
                      onChange={(e) => setEditForm((f) => ({ ...f, siret: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                      placeholder="123 456 789 00012"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">TVA</label>
                    <Input
                      value={editForm.tva_number}
                      onChange={(e) => setEditForm((f) => ({ ...f, tva_number: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                      placeholder="FR12345678901"
                    />
                  </div>
                </div>

                {/* Row 2: Contact / Téléphone */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Contact</label>
                    <Input value={editForm.contact_name} onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))} className="h-9 rounded-lg text-sm" placeholder="Nom du contact" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Téléphone</label>
                    <Input type="tel" value={editForm.contact_phone} onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))} className="h-9 rounded-lg text-sm" placeholder="06 12 34 56 78" />
                  </div>
                </div>

                {/* Row 2b: Emails qualifiés */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Email principal</label>
                    <Input type="email" value={editForm.contact_email} onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))} className="h-9 rounded-lg text-sm" placeholder="contact@example.com" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Email comptable</label>
                    <Input type="email" value={editForm.billing_email} onChange={(e) => setEditForm((f) => ({ ...f, billing_email: e.target.value }))} className="h-9 rounded-lg text-sm" placeholder="compta@example.com" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Email commercial</label>
                    <Input type="email" value={editForm.commercial_email} onChange={(e) => setEditForm((f) => ({ ...f, commercial_email: e.target.value }))} className="h-9 rounded-lg text-sm" placeholder="commercial@example.com" />
                  </div>
                </div>

                {/* Row 3: Adresse / Ville / Code postal */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Adresse</label>
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                      placeholder="12 rue de la Paix"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Ville</label>
                    <Input
                      value={editForm.city}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                      placeholder="Paris"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Code postal</label>
                    <Input
                      value={editForm.postal_code}
                      onChange={(e) => setEditForm((f) => ({ ...f, postal_code: e.target.value }))}
                      className="h-9 rounded-lg text-sm"
                      placeholder="75001"
                    />
                  </div>
                </div>

                {/* Row 4: Notes (full width) */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                    placeholder="Notes internes..."
                  />
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving || !editForm.company_name.trim()}>
                    {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {/* Row 1: Société / SIRET / TVA */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Société</p>
                    <p className="mt-0.5 font-medium">{client.company_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">SIRET</p>
                    <p className="mt-0.5">{client.siret || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">TVA</p>
                    <p className="mt-0.5">{client.tva_number || '—'}</p>
                  </div>
                </div>

                {/* Row 2: Contact / Email / Téléphone */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Contact</p>
                    <p className="mt-0.5">{client.contact_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Téléphone</p>
                    {client.contact_phone ? (
                      <a href={`tel:${client.contact_phone}`} className="mt-0.5 block text-primary hover:underline">{client.contact_phone}</a>
                    ) : <p className="mt-0.5">—</p>}
                  </div>
                </div>

                {/* Row 2b: Emails */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email principal</p>
                    {client.contact_email ? (
                      <a href={`mailto:${client.contact_email}`} className="mt-0.5 block text-primary hover:underline">{client.contact_email}</a>
                    ) : <p className="mt-0.5">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email comptable</p>
                    {client.billing_email ? (
                      <a href={`mailto:${client.billing_email}`} className="mt-0.5 block text-primary hover:underline">{client.billing_email}</a>
                    ) : <p className="mt-0.5">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Email commercial</p>
                    {client.commercial_email ? (
                      <a href={`mailto:${client.commercial_email}`} className="mt-0.5 block text-primary hover:underline">{client.commercial_email}</a>
                    ) : <p className="mt-0.5">—</p>}
                  </div>
                </div>

                {/* Row 3: Adresse / Ville / Code postal */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Adresse</p>
                    <p className="mt-0.5">{client.address || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Ville</p>
                    <p className="mt-0.5">{client.city || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Code postal</p>
                    <p className="mt-0.5">{client.postal_code || '—'}</p>
                  </div>
                </div>

                {/* Row 4: Notes */}
                {client.notes && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Campagnes */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Campagnes ({campaigns.length})
              </h2>
            </div>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune campagne pour ce client.</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <Link
                    key={c.id}
                    to={`/admin/campaigns/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.start_date).toLocaleDateString('fr-FR')} — {new Date(c.end_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${CAMPAIGN_STATUS_CONFIG[c.status as CampaignStatus]?.className ?? ''}`}>
                      {CAMPAIGN_STATUS_CONFIG[c.status as CampaignStatus]?.label ?? c.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devis */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Devis ({quotes.length})
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/admin/quotes/new?client=${client.id}`)}
              >
                Nouveau devis
              </Button>
            </div>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun devis.</p>
            ) : (
              <div className="space-y-2">
                {quotes.map((q) => (
                  <Link
                    key={q.id}
                    to={`/admin/quotes/${q.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{q.quote_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(q.total_ttc)}
                      </span>
                      <Badge variant={QUOTE_STATUS_CONFIG[q.status as QuoteStatus]?.variant ?? 'secondary'} className={QUOTE_STATUS_CONFIG[q.status as QuoteStatus]?.className}>
                        {QUOTE_STATUS_CONFIG[q.status as QuoteStatus]?.label ?? q.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Factures */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Factures ({invoices.length})
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/admin/invoices/new?client=${client.id}`)}
              >
                Nouvelle facture
              </Button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    to={`/admin/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.issued_at).toLocaleDateString('fr-FR')}
                        {inv.status === 'overdue' && (
                          <span className="ml-1 text-red-500"> — en retard</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(inv.total_ttc)}
                      </span>
                      <Badge variant={INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.variant ?? 'secondary'} className={INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.className}>
                        {INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.label ?? inv.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
