import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useClient } from '@/hooks/admin/useClients'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useQuotes } from '@/hooks/admin/useQuotes'
import { useInvoices } from '@/hooks/admin/useInvoices'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Loader2, Building2, Mail, Phone, MapPin,
  Megaphone, FileText, TrendingUp, Clock,
} from 'lucide-react'
import { CAMPAIGN_STATUS_CONFIG, QUOTE_STATUS_CONFIG, INVOICE_STATUS_CONFIG } from '@/lib/constants'
import type { CampaignStatus, QuoteStatus, InvoiceStatus } from '@/lib/constants'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id)
  const { data: allCampaigns } = useCampaigns()
  const { data: allQuotes } = useQuotes()
  const { data: allInvoices } = useInvoices()

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
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{client.company_name}</h1>
          {client.contact_name && (
            <p className="text-sm text-muted-foreground">{client.contact_name}</p>
          )}
        </div>
        {!client.is_active && (
          <Badge variant="secondary">Inactif</Badge>
        )}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info client */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informations
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{client.company_name}</p>
                  {client.siret && <p className="text-xs text-muted-foreground">SIRET : {client.siret}</p>}
                  {client.tva_number && <p className="text-xs text-muted-foreground">TVA : {client.tva_number}</p>}
                </div>
              </div>
              {(client.address || client.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    {client.address && <p>{client.address}</p>}
                    <p className="text-muted-foreground">
                      {[client.postal_code, client.city].filter(Boolean).join(' ')}
                    </p>
                  </div>
                </div>
              )}
              {client.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${client.contact_email}`} className="text-primary hover:underline">
                    {client.contact_email}
                  </a>
                </div>
              )}
              {client.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-muted-foreground" />
                  <a href={`tel:${client.contact_phone}`} className="text-primary hover:underline">
                    {client.contact_phone}
                  </a>
                </div>
              )}
              {client.notes && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campagnes */}
        <Card className="lg:col-span-2">
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
      </div>

      {/* Devis + Factures */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                onClick={() => navigate('/admin/quotes/new')}
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
                      <Badge variant={QUOTE_STATUS_CONFIG[q.status as QuoteStatus]?.variant ?? 'secondary'}>
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
                onClick={() => navigate('/admin/invoices/new')}
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
                      <Badge variant={INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]?.variant ?? 'secondary'}>
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
