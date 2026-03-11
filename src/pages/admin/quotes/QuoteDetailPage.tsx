import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuote, useQuoteLines, useCreateQuote, useUpdateQuote, useSaveQuoteLines, type QuoteLine } from '@/hooks/admin/useQuotes'
import { useClients } from '@/hooks/admin/useClients'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useServiceCatalog } from '@/hooks/admin/useServiceCatalog'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { ArrowLeft, Plus, Trash2, Loader2, Send, Check, X, Package, Receipt } from 'lucide-react'

type EditableLine = Omit<QuoteLine, 'id' | 'quote_id'> & { _key: string }

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyé', variant: 'default' },
  accepted: { label: 'Accepté', variant: 'default' },
  rejected: { label: 'Refusé', variant: 'destructive' },
  cancelled: { label: 'Annulé', variant: 'outline' },
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

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const { data: quote, isLoading: quoteLoading } = useQuote(isNew ? undefined : id)
  const { data: existingLines, isLoading: linesLoading } = useQuoteLines(isNew ? undefined : id)
  const { data: clients } = useClients()
  const { data: campaigns } = useCampaigns()
  const { data: services } = useServiceCatalog()
  const { data: settings } = useCompanySettings()

  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()
  const saveLines = useSaveQuoteLines()

  const [clientId, setClientId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [lines, setLines] = useState<EditableLine[]>([newLine(0)])
  const [saving, setSaving] = useState(false)

  // Init form from existing quote
  useEffect(() => {
    if (quote) {
      setClientId(quote.client_id)
      setCampaignId(quote.campaign_id ?? '')
      setNotes(quote.notes ?? '')
      setValidUntil(quote.valid_until?.split('T')[0] ?? '')
    }
  }, [quote])

  useEffect(() => {
    if (existingLines && existingLines.length > 0) {
      setLines(existingLines.map((l) => ({ ...l, _key: l.id })))
    }
  }, [existingLines])

  // Default valid_until to +30 days for new quotes
  useEffect(() => {
    if (isNew && !validUntil) {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      setValidUntil(d.toISOString().split('T')[0])
    }
  }, [isNew, validUntil])

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
    // Group TVA by rate
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
    if (lines.length === 0 || lines.every((l) => !l.description.trim())) {
      toast('Ajoutez au moins une ligne', 'error')
      return
    }

    setSaving(true)
    try {
      let quoteId = id!

      if (isNew) {
        const prefix = settings?.quote_prefix ?? 'D'
        const nextNum = settings?.next_quote_number ?? 1
        const quoteNumber = `${prefix}${String(nextNum).padStart(4, '0')}`

        const result = await createQuote.mutateAsync({
          quote_number: quoteNumber,
          client_id: clientId,
          campaign_id: campaignId || null,
          status: 'draft',
          issued_at: new Date().toISOString(),
          valid_until: validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
          notes: notes || null,
          created_by: null,
        })
        quoteId = result.id
      } else {
        await updateQuote.mutateAsync({
          id: quoteId,
          client_id: clientId,
          campaign_id: campaignId || null,
          notes: notes || null,
          valid_until: validUntil || undefined,
        })
      }

      await saveLines.mutateAsync({
        quoteId,
        lines: lines
          .filter((l) => l.description.trim())
          .map((l, i) => ({
            quote_id: quoteId,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            tva_rate: l.tva_rate,
            total_ht: l.total_ht,
            sort_order: i,
          })),
      })

      toast(isNew ? 'Devis créé' : 'Devis mis à jour')
      if (isNew) navigate(`/admin/quotes/${quoteId}`, { replace: true })
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: 'sent' | 'accepted' | 'rejected' | 'cancelled') {
    if (!id || isNew) return
    try {
      await updateQuote.mutateAsync({ id, status: newStatus })
      toast(`Devis marqué comme "${statusConfig[newStatus].label}"`)
    } catch {
      toast('Erreur', 'error')
    }
  }

  if (!isNew && (quoteLoading || linesLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeClients = clients?.filter((c) => c.is_active) ?? []
  const activeServices = services?.filter((s) => s.is_active) ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/quotes')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
            {isNew ? 'Nouveau devis' : quote?.quote_number ?? ''}
          </h1>
        </div>
        {!isNew && quote && (
          <Badge variant={statusConfig[quote.status]?.variant ?? 'secondary'}>
            {statusConfig[quote.status]?.label ?? quote.status}
          </Badge>
        )}
      </div>

      {/* Status actions */}
      {!isNew && quote?.status === 'draft' && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('sent')}>
            <Send className="mr-1.5 size-3.5" /> Marquer envoyé
          </Button>
        </div>
      )}
      {!isNew && quote?.status === 'sent' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleStatusChange('accepted')}>
            <Check className="mr-1.5 size-3.5" /> Accepter
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleStatusChange('rejected')}>
            <X className="mr-1.5 size-3.5" /> Refuser
          </Button>
        </div>
      )}
      {!isNew && quote?.status === 'accepted' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate(`/admin/invoices/new?from_quote=${id}`)}>
            <Receipt className="mr-1.5 size-3.5" /> Convertir en facture
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
            <label className="text-xs font-medium text-muted-foreground">Valide jusqu'au</label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
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
            <p className="text-sm font-semibold">Lignes du devis</p>
            <div className="flex gap-2">
              {activeServices.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) addFromCatalog(e.target.value)
                    e.target.value = ''
                  }}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">
                    Depuis catalogue...
                  </option>
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

          {/* Table header */}
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
                      <p className="text-xs">Ajoutez des lignes au devis</p>
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
          {isNew ? 'Créer le devis' : 'Enregistrer'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/quotes')}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
