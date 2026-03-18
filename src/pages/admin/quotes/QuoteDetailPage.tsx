import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuote, useQuoteLines, useCreateQuote, useUpdateQuote, useSaveQuoteLines, type QuoteLine } from '@/hooks/admin/useQuotes'
import { useClients, useClient } from '@/hooks/admin/useClients'
import { useClientCampaigns } from '@/hooks/useCampaigns'
import { useServiceCatalog } from '@/hooks/admin/useServiceCatalog'
import { useQuoteTemplates, useCreateQuoteTemplate, type TemplateLine } from '@/hooks/admin/useQuoteTemplates'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { useAppStore } from '@/store/app.store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { ArrowLeft, Plus, Trash2, Loader2, Send, Check, X, Package, Receipt, Download, Copy, Ban, Eye, ChevronUp, ChevronDown, Bookmark, BookmarkPlus, ExternalLink } from 'lucide-react'
import { LineDescriptionEditor } from '@/components/shared/LineDescriptionEditor'
import { DocumentAttachments } from '@/components/shared/DocumentAttachments'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { QuotePDF } from '@/lib/pdf/QuotePDF'
import { QUOTE_STATUS_CONFIG, type QuoteStatus } from '@/lib/constants'

type EditableLine = Omit<QuoteLine, 'id' | 'quote_id'> & { _key: string }

function newLine(sortOrder: number, lineType: 'item' | 'section' = 'item'): EditableLine {
  return {
    _key: crypto.randomUUID(),
    service_catalog_id: null,
    description: lineType === 'section' ? 'Nouvelle section' : '',
    quantity: lineType === 'section' ? 0 : 1,
    unit: lineType === 'section' ? '' : 'unité',
    unit_price: 0,
    tva_rate: lineType === 'section' ? 0 : 20,
    discount_type: null,
    discount_value: 0,
    line_type: lineType,
    total_ht: 0,
    sort_order: sortOrder,
  }
}

function computeLineTotal(qty: number, unitPrice: number, discountType: string | null, discountValue: number): number {
  const gross = qty * unitPrice
  if (!discountType || !discountValue) return Math.round(gross * 100) / 100
  if (discountType === 'percent') return Math.round(gross * (1 - discountValue / 100) * 100) / 100
  return Math.round(Math.max(0, gross - discountValue) * 100) / 100
}

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const { data: quote, isLoading: quoteLoading } = useQuote(isNew ? undefined : id)
  const { data: existingLines, isLoading: linesLoading } = useQuoteLines(isNew ? undefined : id)
  const { data: clients } = useClients()
  const { data: services } = useServiceCatalog()
  const { data: settings } = useCompanySettings()

  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()
  const { data: templates } = useQuoteTemplates()
  const createTemplate = useCreateQuoteTemplate()
  const saveLines = useSaveQuoteLines()
  const profile = useAppStore((s) => s.profile)

  const [clientId, setClientId] = useState('')
  const { data: clientCampaigns } = useClientCampaigns(clientId || undefined)
  const [campaignId, setCampaignId] = useState('')
  const [notes, setNotes] = useState('')
  const [clientReference, setClientReference] = useState('')
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState('')
  const [lines, setLines] = useState<EditableLine[]>([newLine(0)])
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: clientData } = useClient(clientId || undefined)

  // Is the form read-only? (not draft = locked)
  const isLocked = !isNew && !!quote && quote.status !== 'draft'

  // Init form from existing quote
  useEffect(() => {
    if (quote) {
      setClientId(quote.client_id)
      setCampaignId(quote.campaign_id ?? '')
      setNotes(quote.notes ?? '')
      setClientReference(quote.client_reference ?? '')
      setIssuedAt(quote.issued_at?.split('T')[0] ?? new Date().toISOString().split('T')[0])
      setValidUntil(quote.valid_until?.split('T')[0] ?? '')
    }
  }, [quote])

  useEffect(() => {
    if (existingLines && existingLines.length > 0) {
      setLines(existingLines.map((l) => ({ ...l, _key: l.id })))
    }
  }, [existingLines])

  // Reset campaign when client changes (except on initial load from existing quote)
  const [clientInitialized, setClientInitialized] = useState(false)
  useEffect(() => {
    if (!clientInitialized && clientId) {
      setClientInitialized(true)
      return
    }
    if (clientInitialized) {
      setCampaignId('')
    }
  }, [clientId])

  // Default valid_until to +30 days for new quotes
  useEffect(() => {
    if (isNew && !validUntil) {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      setValidUntil(d.toISOString().split('T')[0])
    }
  }, [isNew, validUntil])

  function updateLine(key: string, field: keyof EditableLine, value: string | number | null) {
    if (isLocked) return
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l
        const updated = { ...l, [field]: value }
        if (['quantity', 'unit_price', 'discount_type', 'discount_value'].includes(field)) {
          updated.total_ht = computeLineTotal(updated.quantity, updated.unit_price, updated.discount_type, updated.discount_value)
        }
        return updated
      }),
    )
  }

  function addLine() {
    if (isLocked) return
    setLines((prev) => [...prev, newLine(prev.length)])
  }

  function updateLineFromCatalog(key: string, selection: { service_catalog_id: string; description: string; unit: string; unit_price: number; tva_rate: number }) {
    if (isLocked) return
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l
        return {
          ...l,
          service_catalog_id: selection.service_catalog_id,
          description: selection.description,
          unit: selection.unit,
          unit_price: selection.unit_price,
          tva_rate: selection.tva_rate,
          total_ht: Math.round(l.quantity * selection.unit_price * 100) / 100,
        }
      }),
    )
  }

  function duplicateLine(key: string) {
    if (isLocked) return
    setLines((prev) => {
      const idx = prev.findIndex((l) => l._key === key)
      if (idx === -1) return prev
      const clone = { ...prev[idx], _key: crypto.randomUUID(), sort_order: prev.length }
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]
    })
  }

  function removeLine(key: string) {
    if (isLocked) return
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  function moveLineUp(key: string) {
    if (isLocked) return
    setLines((prev) => {
      const idx = prev.findIndex((l) => l._key === key)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveLineDown(key: string) {
    if (isLocked) return
    setLines((prev) => {
      const idx = prev.findIndex((l) => l._key === key)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
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
    if (isLocked) return
    if (!clientId) {
      toast('Veuillez sélectionner un client', 'error')
      return
    }
    if (!campaignId) {
      toast('Veuillez sélectionner une campagne', 'error')
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
        // Atomic numbering via SQL function
        const { data: quoteNumber, error: rpcError } = await supabase.rpc('get_next_quote_number')
        let finalNumber: string
        if (rpcError || !quoteNumber) {
          // Fallback to client-side numbering
          const prefix = settings?.quote_prefix ?? 'D'
          const nextNum = settings?.next_quote_number ?? 1
          const now = new Date()
          const yy = String(now.getFullYear() % 100).padStart(2, '0')
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          finalNumber = `${prefix}-${yy}${mm}-${String(nextNum).padStart(4, '0')}`
        } else {
          finalNumber = quoteNumber
        }

        const result = await createQuote.mutateAsync({
          quote_number: finalNumber,
          client_id: clientId,
          campaign_id: campaignId,
          status: 'draft',
          issued_at: issuedAt || new Date().toISOString().split('T')[0],
          valid_until: validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
          notes: notes || null,
          client_reference: clientReference || null,
          created_by: profile?.id ?? null,
        })
        quoteId = result.id
      } else {
        await updateQuote.mutateAsync({
          id: quoteId,
          client_id: clientId,
          campaign_id: campaignId,
          notes: notes || null,
          client_reference: clientReference || null,
          valid_until: validUntil || undefined,
        })
      }

      await saveLines.mutateAsync({
        quoteId,
        lines: lines
          .filter((l) => l.description.trim())
          .map((l, i) => ({
            quote_id: quoteId,
            service_catalog_id: l.service_catalog_id ?? null,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            tva_rate: l.tva_rate,
            total_ht: l.total_ht,
            discount_type: l.discount_type ?? null,
            discount_value: l.discount_value ?? 0,
            line_type: l.line_type ?? 'item',
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

  async function handleStatusChange(newStatus: QuoteStatus) {
    if (!id || isNew) return
    try {
      await updateQuote.mutateAsync({ id, status: newStatus })
      toast(`Devis marqué comme "${QUOTE_STATUS_CONFIG[newStatus].label}"`)
    } catch {
      toast('Erreur', 'error')
    }
  }

  async function handleDownloadPDF() {
    if (!quote || !clientData || !settings) {
      toast('Données manquantes pour le PDF', 'error')
      return
    }
    try {
      const blob = await pdf(
        <QuotePDF
          quote={quote}
          contactName={profile?.full_name}
          client={{
            ...clientData,
            email: clientData.contact_email,
            phone: clientData.contact_phone,
          }}
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
          termsHtml={settings.terms_and_conditions}
        />,
      ).toBlob()
      saveAs(blob, `${quote.quote_number}.pdf`)
    } catch {
      toast('Erreur lors de la génération du PDF', 'error')
    }
  }

  async function handlePreviewPDF() {
    if (!quote || !clientData || !settings) {
      toast('Données manquantes pour le PDF', 'error')
      return
    }
    try {
      const blob = await pdf(
        <QuotePDF
          quote={quote}
          contactName={profile?.full_name}
          client={{
            ...clientData,
            email: clientData.contact_email,
            phone: clientData.contact_phone,
          }}
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
          termsHtml={settings.terms_and_conditions}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch {
      toast('Erreur lors de la génération du PDF', 'error')
    }
  }

  async function handleDuplicate() {
    if (!quote || !settings) return
    setSaving(true)
    try {
      const { data: num, error: rpcError } = await supabase.rpc('get_next_quote_number')
      let finalNumber: string
      if (rpcError || !num) {
        const prefix = settings.quote_prefix ?? 'D'
        const nextNum = settings.next_quote_number ?? 1
        const now = new Date()
        const yy = String(now.getFullYear() % 100).padStart(2, '0')
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        finalNumber = `${prefix}-${yy}${mm}-${String(nextNum).padStart(4, '0')}`
      } else {
        finalNumber = num
      }

      const result = await createQuote.mutateAsync({
        quote_number: finalNumber,
        client_id: clientId,
        campaign_id: campaignId || null,
        status: 'draft',
        issued_at: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
        notes: notes || null,
        client_reference: clientReference || null,
        created_by: profile?.id ?? null,
      })

      await saveLines.mutateAsync({
        quoteId: result.id,
        lines: lines.filter((l) => l.description.trim()).map((l, i) => ({
          quote_id: result.id,
          service_catalog_id: l.service_catalog_id ?? null,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          tva_rate: l.tva_rate,
          discount_type: l.discount_type ?? null,
          discount_value: l.discount_value ?? 0,
          line_type: l.line_type ?? 'item',
          total_ht: l.total_ht,
          sort_order: i,
        })),
      })

      toast('Devis dupliqué')
      navigate(`/admin/quotes/${result.id}`)
    } catch {
      toast('Erreur lors de la duplication', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAsTemplate() {
    const name = window.prompt('Nom du modèle :')
    if (!name?.trim()) return
    try {
      const templateLines: TemplateLine[] = lines
        .filter((l) => l.description.trim())
        .map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          tva_rate: l.tva_rate,
          discount_type: l.discount_type ?? null,
          discount_value: l.discount_value ?? 0,
        }))
      await createTemplate.mutateAsync({ name: name.trim(), lines: templateLines, notes: notes || null })
      toast('Modèle enregistré')
    } catch {
      toast('Erreur', 'error')
    }
  }

  function handleLoadTemplate(templateId: string) {
    const tpl = templates?.find((t) => t.id === templateId)
    if (!tpl) return
    setLines(tpl.lines.map((l, i) => ({
      _key: crypto.randomUUID(),
      service_catalog_id: null,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unit_price,
      tva_rate: l.tva_rate,
      discount_type: l.discount_type ?? null,
      discount_value: l.discount_value ?? 0,
      line_type: 'item' as const,
      total_ht: computeLineTotal(l.quantity, l.unit_price, l.discount_type, l.discount_value ?? 0),
      sort_order: i,
    })))
    if (tpl.notes) setNotes(tpl.notes)
    toast(`Modèle "${tpl.name}" chargé`)
  }

  if (!isNew && (quoteLoading || linesLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeClients = clients?.filter((c) => c.is_active) ?? []

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
          <>
            <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={saving}>
              <Copy className="mr-1.5 size-3.5" /> Dupliquer
            </Button>
            {quote.public_token && (
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/view/${quote.public_token}`); toast('Lien copié') }}>
                <ExternalLink className="mr-1 size-3.5" /> Lien
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handlePreviewPDF}>
              <Eye className="mr-1.5 size-3.5" /> Aperçu
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-1.5 size-3.5" /> PDF
            </Button>
            {['converted', 'cancelled', 'rejected'].includes(quote.status) && !quote.is_archived && (
              <Button size="sm" variant="ghost" onClick={() => updateQuote.mutateAsync({ id: id!, is_archived: true }).then(() => toast('Devis archivé'))}>
                Archiver
              </Button>
            )}
            <Badge variant={QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]?.variant ?? 'secondary'}>
              {QUOTE_STATUS_CONFIG[quote.status as QuoteStatus]?.label ?? quote.status}
            </Badge>
          </>
        )}
      </div>

      {/* PDF Preview Dialog */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
          <div className="relative h-[90vh] w-[90vw] max-w-4xl rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-medium">Aperçu — {quote?.quote_number}</p>
              <Button size="sm" variant="ghost" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
                <X className="size-4" />
              </Button>
            </div>
            <iframe src={previewUrl} className="h-[calc(100%-3.5rem)] w-full rounded-b-lg" />
          </div>
        </div>
      )}

      {/* Locked banner */}
      {isLocked && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-600">
          Ce devis est en statut "{QUOTE_STATUS_CONFIG[quote!.status as QuoteStatus]?.label}" et ne peut plus être modifié.
        </div>
      )}

      {/* Status actions */}
      {!isNew && quote?.status === 'draft' && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('sent')}>
            <Send className="mr-1.5 size-3.5" /> Marquer envoyé
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('cancelled')}>
            <Ban className="mr-1.5 size-3.5" /> Annuler
          </Button>
        </div>
      )}
      {!isNew && quote?.status === 'sent' && quote.valid_until && new Date(quote.valid_until) < new Date() && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          Ce devis a expiré le {new Date(quote.valid_until).toLocaleDateString('fr-FR')}. Vous pouvez le dupliquer pour créer un nouveau devis.
        </div>
      )}
      {!isNew && quote?.status === 'sent' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleStatusChange('accepted')} disabled={!!(quote.valid_until && new Date(quote.valid_until) < new Date())}>
            <Check className="mr-1.5 size-3.5" /> Accepter
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleStatusChange('rejected')}>
            <X className="mr-1.5 size-3.5" /> Refuser
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('cancelled')}>
            <Ban className="mr-1.5 size-3.5" /> Annuler
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
              disabled={isLocked}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">Sélectionner...</option>
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Campagne *</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              disabled={isLocked || !clientId}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">
                {!clientId
                  ? 'Sélectionner un client d\u2019abord'
                  : clientCampaigns?.length === 0
                    ? 'Aucune campagne pour ce client'
                    : 'Sélectionner...'}
              </option>
              {clientCampaigns?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status === 'draft' ? 'Brouillon' : c.status === 'active' ? 'Active' : 'Annulée'})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date d'émission</label>
            <Input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              disabled={isLocked}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Valide jusqu'au</label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              disabled={isLocked}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Réf. dossier / N° commande</label>
            <Input
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              disabled={isLocked}
              placeholder="Ex: 25090548"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLocked}
              placeholder="Notes..."
              rows={2}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Lignes du devis</p>
            {!isLocked && (
              <div className="flex gap-2">
                {templates && templates.length > 0 && (
                  <select
                    onChange={(e) => { if (e.target.value) handleLoadTemplate(e.target.value); e.target.value = '' }}
                    className="h-7 rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    <option value="">
                      <Bookmark className="inline size-3" /> Modèles...
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.lines.length} lignes)</option>
                    ))}
                  </select>
                )}
                {lines.some((l) => l.description.trim()) && (
                  <Button size="sm" variant="ghost" onClick={handleSaveAsTemplate} className="h-7 text-xs">
                    <BookmarkPlus className="mr-1 size-3" /> Sauver modèle
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setLines((prev) => [...prev, newLine(prev.length, 'section')])} className="h-7 text-xs">
                  + Section
                </Button>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="mr-1 size-3.5" /> Ligne
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="min-w-[200px] px-2 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="w-20 px-2 py-2 font-medium text-muted-foreground">Qté</th>
                  <th className="w-24 px-2 py-2 font-medium text-muted-foreground">Unité</th>
                  <th className="w-24 px-2 py-2 font-medium text-muted-foreground">PU HT</th>
                  <th className="w-28 px-2 py-2 font-medium text-muted-foreground">Remise</th>
                  <th className="w-20 px-2 py-2 font-medium text-muted-foreground">TVA %</th>
                  <th className="w-24 px-2 py-2 text-right font-medium text-muted-foreground">Total HT</th>
                  {!isLocked && <th className="w-20" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line._key} className="border-b border-border/50">
                    <td className="px-2 py-1.5">
                      <LineDescriptionEditor
                        value={line.description}
                        onChange={(v) => updateLine(line._key, 'description', v)}
                        onSelectCatalog={(sel) => updateLineFromCatalog(line._key, sel)}
                        services={services ?? undefined}
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(line._key, 'quantity', parseFloat(e.target.value) || 0)}
                        disabled={isLocked}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.unit}
                        onChange={(e) => updateLine(line._key, 'unit', e.target.value)}
                        disabled={isLocked}
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
                        disabled={isLocked}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.discount_value || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            if (!line.discount_type && val > 0) updateLine(line._key, 'discount_type', 'percent')
                            updateLine(line._key, 'discount_value', val)
                          }}
                          disabled={isLocked}
                          placeholder="—"
                          className="h-8 w-16 text-sm"
                        />
                        <select
                          value={line.discount_type ?? ''}
                          onChange={(e) => updateLine(line._key, 'discount_type', e.target.value || null)}
                          disabled={isLocked}
                          className="h-8 w-12 rounded-lg border border-input bg-background px-1 text-xs disabled:opacity-50"
                        >
                          <option value="">—</option>
                          <option value="percent">%</option>
                          <option value="amount">€</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={line.tva_rate}
                        onChange={(e) => updateLine(line._key, 'tva_rate', parseFloat(e.target.value))}
                        disabled={isLocked}
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-2 text-sm disabled:opacity-50"
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
                    {!isLocked && (
                      <td className="px-2 py-1.5">
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => moveLineUp(line._key)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Monter"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            onClick={() => moveLineDown(line._key)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Descendre"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateLine(line._key)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Dupliquer"
                          >
                            <Copy className="size-3.5" />
                          </button>
                          <button
                            onClick={() => removeLine(line._key)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={isLocked ? 6 : 7} className="px-2 py-8 text-center text-muted-foreground">
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

      {/* Attachments */}
      {!isNew && <DocumentAttachments documentType="quote" documentId={id} disabled={isLocked} />}

      {/* Save */}
      {!isLocked && (
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            {isNew ? 'Créer le devis' : 'Enregistrer'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/quotes')}>
            Annuler
          </Button>
        </div>
      )}
    </div>
  )
}
