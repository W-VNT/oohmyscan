import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useInvoice, useInvoiceLines, useCreateInvoice, useUpdateInvoice, useSaveInvoiceLines, type InvoiceLine } from '@/hooks/admin/useInvoices'
import { useQuote, useQuoteLines } from '@/hooks/admin/useQuotes'
import { useClients } from '@/hooks/admin/useClients'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useServiceCatalog } from '@/hooks/admin/useServiceCatalog'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { ArrowLeft, Plus, Trash2, Loader2, Send, Check, Package, Download, Mail } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/pdf/InvoicePDF'
import { useClient } from '@/hooks/admin/useClients'

type EditableLine = Omit<InvoiceLine, 'id' | 'invoice_id'> & { _key: string }

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyée', variant: 'default' },
  paid: { label: 'Payée', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'outline' },
}

function newLine(sortOrder: number): EditableLine {
  return {
    _key: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unit: 'unité',
    unit_price: 0,
    tva_rate: 20,
    total_ht: 0,
    sort_order: sortOrder,
  }
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const fromQuoteId = searchParams.get('from_quote')

  const { data: invoice, isLoading: invoiceLoading } = useInvoice(isNew ? undefined : id)
  const { data: existingLines, isLoading: linesLoading } = useInvoiceLines(isNew ? undefined : id)
  const { data: sourceQuote } = useQuote(fromQuoteId ?? undefined)
  const { data: sourceQuoteLines } = useQuoteLines(fromQuoteId ?? undefined)
  const { data: clients } = useClients()
  const { data: campaigns } = useCampaigns()
  const { data: services } = useServiceCatalog()
  const { data: settings } = useCompanySettings()

  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const saveLines = useSaveInvoiceLines()

  const [clientId, setClientId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [quoteId, setQuoteId] = useState('')
  const [notes, setNotes] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [lines, setLines] = useState<EditableLine[]>([newLine(0)])
  const [saving, setSaving] = useState(false)

  const { data: clientData } = useClient(clientId || undefined)

  // Init from existing invoice
  useEffect(() => {
    if (invoice) {
      setClientId(invoice.client_id)
      setCampaignId(invoice.campaign_id ?? '')
      setQuoteId(invoice.quote_id ?? '')
      setNotes(invoice.notes ?? '')
      setDueAt(invoice.due_at?.split('T')[0] ?? '')
    }
  }, [invoice])

  useEffect(() => {
    if (existingLines && existingLines.length > 0) {
      setLines(existingLines.map((l) => ({ ...l, _key: l.id })))
    }
  }, [existingLines])

  // Pre-fill from quote
  useEffect(() => {
    if (sourceQuote && isNew) {
      setClientId(sourceQuote.client_id)
      setCampaignId(sourceQuote.campaign_id ?? '')
      setQuoteId(sourceQuote.id)
      setNotes(sourceQuote.notes ?? '')
    }
  }, [sourceQuote, isNew])

  useEffect(() => {
    if (sourceQuoteLines && sourceQuoteLines.length > 0 && isNew) {
      setLines(sourceQuoteLines.map((l) => ({
        _key: crypto.randomUUID(),
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.unit_price,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        sort_order: l.sort_order,
      })))
    }
  }, [sourceQuoteLines, isNew])

  // Default due date +30 days
  useEffect(() => {
    if (isNew && !dueAt) {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      setDueAt(d.toISOString().split('T')[0])
    }
  }, [isNew, dueAt])

  function updateLine(key: string, field: keyof EditableLine, value: string | number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l
        const updated = { ...l, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_ht = Math.round(updated.quantity * updated.unit_price * 100) / 100
        }
        return updated
      }),
    )
  }

  function addLine() {
    setLines((prev) => [...prev, newLine(prev.length)])
  }

  function addFromCatalog(serviceId: string) {
    const service = services?.find((s) => s.id === serviceId)
    if (!service) return
    setLines((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        description: service.name,
        quantity: 1,
        unit: service.unit,
        unit_price: service.default_unit_price,
        tva_rate: service.default_tva_rate,
        total_ht: service.default_unit_price,
        sort_order: prev.length,
      },
    ])
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  const totals = useMemo(() => {
    const totalHt = lines.reduce((sum, l) => sum + l.total_ht, 0)
    const tvaByRate: Record<number, number> = {}
    for (const l of lines) {
      const tva = l.total_ht * (l.tva_rate / 100)
      tvaByRate[l.tva_rate] = (tvaByRate[l.tva_rate] ?? 0) + tva
    }
    const totalTva = Object.values(tvaByRate).reduce((s, v) => s + v, 0)
    return {
      totalHt: Math.round(totalHt * 100) / 100,
      totalTva: Math.round(totalTva * 100) / 100,
      totalTtc: Math.round((totalHt + totalTva) * 100) / 100,
      tvaByRate,
    }
  }, [lines])

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  async function handleSave() {
    if (!clientId) {
      toast('Veuillez sélectionner un client', 'error')
      return
    }

    setSaving(true)
    try {
      let invoiceId = id!

      if (isNew) {
        // Atomic numbering via SQL function
        const { data: invoiceNumber, error: rpcError } = await supabase.rpc('get_next_invoice_number')
        if (rpcError || !invoiceNumber) {
          const prefix = settings?.invoice_prefix ?? 'F'
          const nextNum = settings?.next_invoice_number ?? 1
          var fallbackInvoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`
        }

        const result = await createInvoice.mutateAsync({
          invoice_number: invoiceNumber ?? fallbackInvoiceNumber!,
          client_id: clientId,
          campaign_id: campaignId || null,
          quote_id: quoteId || null,
          status: 'draft',
          issued_at: new Date().toISOString(),
          due_at: dueAt || new Date(Date.now() + 30 * 86400000).toISOString(),
          paid_at: null,
          notes: notes || null,
          created_by: null,
        })
        invoiceId = result.id
      } else {
        await updateInvoice.mutateAsync({
          id: invoiceId,
          client_id: clientId,
          campaign_id: campaignId || null,
          notes: notes || null,
          due_at: dueAt || undefined,
        })
      }

      await saveLines.mutateAsync({
        invoiceId,
        lines: lines
          .filter((l) => l.description.trim())
          .map((l, i) => ({
            invoice_id: invoiceId,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            tva_rate: l.tva_rate,
            total_ht: l.total_ht,
            sort_order: i,
          })),
      })

      toast(isNew ? 'Facture créée' : 'Facture mise à jour')
      if (isNew) navigate(`/admin/invoices/${invoiceId}`, { replace: true })
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: 'sent' | 'paid' | 'overdue' | 'cancelled') {
    if (!id || isNew) return
    try {
      const updates: Record<string, unknown> = { id, status: newStatus }
      if (newStatus === 'paid') updates.paid_at = new Date().toISOString()
      await updateInvoice.mutateAsync(updates as { id: string; status: 'paid'; paid_at: string })
      toast(`Facture marquée comme "${statusConfig[newStatus].label}"`)
    } catch {
      toast('Erreur', 'error')
    }
  }

  if (!isNew && (invoiceLoading || linesLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  async function handleDownloadPDF() {
    if (!invoice || !clientData || !settings) {
      toast('Données manquantes pour le PDF', 'error')
      return
    }
    try {
      const blob = await pdf(
        <InvoicePDF
          invoice={invoice}
          quoteNumber={sourceQuote?.quote_number}
          client={clientData}
          lines={lines.filter((l) => l.description.trim()).map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            tva_rate: l.tva_rate,
            total_ht: l.total_ht,
          }))}
          company={{
            ...settings,
            logo_url: settings.logo_path
              ? supabase.storage.from('company-assets').getPublicUrl(settings.logo_path).data.publicUrl
              : null,
          }}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('Erreur lors de la génération du PDF', 'error')
    }
  }

  function handleMailto() {
    if (!invoice || !clientData || !settings) return
    const subject = encodeURIComponent(`Facture ${invoice.invoice_number}`)
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint la facture ${invoice.invoice_number} d'un montant de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totals.totalTtc)} TTC.\n\nÉchéance : ${new Date(invoice.due_at).toLocaleDateString('fr-FR')}\n\n${settings.iban ? `Règlement par virement :\nIBAN : ${settings.iban}${settings.bic ? `\nBIC : ${settings.bic}` : ''}\n\n` : ''}Cordialement,\n${settings.company_name ?? 'OOHMYAD'}`,
    )
    const to = clientData.contact_email ? encodeURIComponent(clientData.contact_email) : ''
    window.open(`mailto:${to}?subject=${subject}&body=${body}`)
  }

  const activeClients = clients?.filter((c) => c.is_active) ?? []
  const activeServices = services?.filter((s) => s.is_active) ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/invoices')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
            {isNew ? 'Nouvelle facture' : invoice?.invoice_number ?? ''}
          </h1>
          {fromQuoteId && sourceQuote && (
            <p className="text-xs text-muted-foreground">Depuis devis {sourceQuote.quote_number}</p>
          )}
        </div>
        {!isNew && invoice && (
          <>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-1.5 size-3.5" /> PDF
            </Button>
            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
              <Button size="sm" variant="outline" onClick={handleMailto}>
                <Mail className="mr-1.5 size-3.5" /> Relancer
              </Button>
            )}
            <Badge variant={statusConfig[invoice.status]?.variant ?? 'secondary'}>
              {statusConfig[invoice.status]?.label ?? invoice.status}
            </Badge>
          </>
        )}
      </div>

      {/* Status actions */}
      {!isNew && invoice?.status === 'draft' && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('sent')}>
            <Send className="mr-1.5 size-3.5" /> Marquer envoyée
          </Button>
        </div>
      )}
      {!isNew && invoice?.status === 'sent' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleStatusChange('paid')}>
            <Check className="mr-1.5 size-3.5" /> Marquer payée
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleStatusChange('overdue')}>
            En retard
          </Button>
        </div>
      )}

      {/* Client + Campaign + Dates */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sélectionner...</option>
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Campagne</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Aucune</option>
              {campaigns?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Échéance</label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes..."
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Lignes de la facture</p>
            <div className="flex gap-2">
              {activeServices.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) addFromCatalog(e.target.value)
                    e.target.value = ''
                  }}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Depuis catalogue...</option>
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.default_unit_price}€)
                    </option>
                  ))}
                </select>
              )}
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="mr-1 size-3.5" /> Ligne
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="min-w-[200px] px-2 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="w-20 px-2 py-2 font-medium text-muted-foreground">Qté</th>
                  <th className="w-24 px-2 py-2 font-medium text-muted-foreground">Unité</th>
                  <th className="w-28 px-2 py-2 font-medium text-muted-foreground">PU HT</th>
                  <th className="w-24 px-2 py-2 font-medium text-muted-foreground">TVA %</th>
                  <th className="w-28 px-2 py-2 text-right font-medium text-muted-foreground">Total HT</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line._key} className="border-b border-border/50">
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line._key, 'description', e.target.value)}
                        placeholder="Description..."
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(line._key, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.unit}
                        onChange={(e) => updateLine(line._key, 'unit', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateLine(line._key, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={line.tva_rate}
                        onChange={(e) => updateLine(line._key, 'tva_rate', parseFloat(e.target.value))}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value={0}>0%</option>
                        <option value={5.5}>5,5%</option>
                        <option value={10}>10%</option>
                        <option value={20}>20%</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                      {formatCurrency(line.total_ht)}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => removeLine(line._key)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-8 text-center text-muted-foreground">
                      <Package className="mx-auto mb-2 size-6" />
                      <p className="text-xs">Ajoutez des lignes à la facture</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Separator />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-medium tabular-nums">{formatCurrency(totals.totalHt)}</span>
              </div>
              {Object.entries(totals.tvaByRate).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between">
                  <span className="text-muted-foreground">TVA {rate}%</span>
                  <span className="tabular-nums">{formatCurrency(amount)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total TTC</span>
                <span className="tabular-nums">{formatCurrency(totals.totalTtc)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          {isNew ? 'Créer la facture' : 'Enregistrer'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/invoices')}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
