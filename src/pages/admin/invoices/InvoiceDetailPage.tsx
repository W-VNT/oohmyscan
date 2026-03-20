import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useInvoice, useInvoiceLines, useCreateInvoice, useUpdateInvoice, useSaveInvoiceLines, useCampaignDepositInvoices, type InvoiceLine } from '@/hooks/admin/useInvoices'
import { useInvoicePayments, useCreatePayment, useDeletePayment, PAYMENT_METHOD_LABELS, type Payment } from '@/hooks/admin/usePayments'
import { useQuote, useQuoteLines, useUpdateQuote } from '@/hooks/admin/useQuotes'
import { useClients, useClient } from '@/hooks/admin/useClients'
import { useClientCampaigns } from '@/hooks/useCampaigns'
import { useServiceCatalog } from '@/hooks/admin/useServiceCatalog'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { useAppStore } from '@/store/app.store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/shared/Toast'
import { ArrowLeft, Plus, Trash2, Loader2, Send, Check, Package, Download, Mail, Copy, Ban, FileText, Eye, X, ChevronUp, ChevronDown, ExternalLink, MoreHorizontal, Archive } from 'lucide-react'
import { LineDescriptionEditor } from '@/components/shared/LineDescriptionEditor'
import { DocumentAttachments } from '@/components/shared/DocumentAttachments'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { InvoicePDF } from '@/lib/pdf/InvoicePDF'
import { generateEPCQR } from '@/lib/pdf/epc-qr'
import { INVOICE_STATUS_CONFIG, INVOICE_TYPE_LABELS, PAYMENT_TERMS, PAYMENT_TERMS_LABELS, computeDueDate, type InvoiceStatus, type InvoiceType, type PaymentTerms } from '@/lib/constants'

type EditableLine = Omit<InvoiceLine, 'id' | 'invoice_id'> & { _key: string }

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

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const fromQuoteId = searchParams.get('from_quote')

  const { data: invoice, isLoading: invoiceLoading } = useInvoice(isNew ? undefined : id)
  const { data: existingLines, isLoading: linesLoading } = useInvoiceLines(isNew ? undefined : id)
  const { data: sourceQuote } = useQuote(fromQuoteId ?? invoice?.quote_id ?? undefined)
  const { data: sourceQuoteLines } = useQuoteLines(fromQuoteId ?? undefined)
  const { data: clients } = useClients()
  const { data: services } = useServiceCatalog()
  const { data: settings } = useCompanySettings()

  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const updateQuote = useUpdateQuote()
  const saveLines = useSaveInvoiceLines()
  const profile = useAppStore((s) => s.profile)

  const [clientId, setClientId] = useState('')
  const { data: clientCampaigns, isLoading: campaignsLoading } = useClientCampaigns(clientId || undefined)
  const [campaignId, setCampaignId] = useState('')
  const [quoteId, setQuoteId] = useState('')
  const [notes, setNotes] = useState('')
  const [clientReference, setClientReference] = useState('')
  const [dueAt, setDueAt] = useState(() => computeDueDate(new Date().toISOString(), '30_days'))
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('standard')
  const [depositPercentage, setDepositPercentage] = useState<number>(30)
  const [depositInvoiceId, setDepositInvoiceId] = useState('')
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30_days')
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().split('T')[0])
  const [lines, setLines] = useState<EditableLine[]>([newLine(0)])
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  // Payments
  const { data: payments } = useInvoicePayments(!isNew ? id : undefined)
  const createPayment = useCreatePayment()
  const deletePayment = useDeletePayment()
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'virement' as Payment['payment_method'], date: new Date().toISOString().split('T')[0], reference: '', notes: '' })

  const { data: clientData } = useClient(clientId || undefined)
  const { data: depositInvoices } = useCampaignDepositInvoices(campaignId || undefined)

  // Lock levels:
  // - isCancelled: fully locked, nothing editable
  // - isStructureLocked: prices, client, campaign, number locked — descriptions/notes still editable
  const isCancelled = !isNew && !!invoice && invoice.status === 'cancelled'
  const isStructureLocked = !isNew && !!invoice && invoice.status !== 'draft'

  // Init from existing invoice
  useEffect(() => {
    if (invoice) {
      setClientId(invoice.client_id)
      setCampaignId(invoice.campaign_id ?? '')
      setQuoteId(invoice.quote_id ?? '')
      setNotes(invoice.notes ?? '')
      setClientReference(invoice.client_reference ?? '')
      setIssuedAt(invoice.issued_at?.split('T')[0] ?? new Date().toISOString().split('T')[0])
      setDueAt(invoice.due_at?.split('T')[0] ?? '')
      setInvoiceType((invoice.invoice_type as InvoiceType) ?? 'standard')
      setDepositPercentage(invoice.deposit_percentage ?? 30)
      setDepositInvoiceId(invoice.deposit_invoice_id ?? '')
      setPaymentTerms((invoice.payment_terms as PaymentTerms) ?? '30_days')
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
      setClientReference(sourceQuote.client_reference ?? '')
    }
  }, [sourceQuote, isNew])

  useEffect(() => {
    if (sourceQuoteLines && sourceQuoteLines.length > 0 && isNew) {
      setLines(sourceQuoteLines.map((l) => ({
        _key: crypto.randomUUID(),
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
        sort_order: l.sort_order,
      })))
    }
  }, [sourceQuoteLines, isNew])

  // Reset campaign when client changes (except on initial load)
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

  // Auto-compute due date from payment terms + issue date
  useEffect(() => {
    if (isNew || (!isStructureLocked && issuedAt)) {
      setDueAt(computeDueDate(issuedAt, paymentTerms))
    }
  }, [isNew, isStructureLocked, paymentTerms, issuedAt])

  function updateLine(key: string, field: keyof EditableLine, value: string | number | null) {
    if (isCancelled) return
    // When structure is locked, only description is editable
    if (isStructureLocked && field !== 'description') return
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
    if (isStructureLocked) return
    setLines((prev) => [...prev, newLine(prev.length)])
  }

  function updateLineFromCatalog(key: string, selection: { service_catalog_id: string; description: string; unit: string; unit_price: number; tva_rate: number }) {
    if (isStructureLocked) return
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
    if (isStructureLocked) return
    setLines((prev) => {
      const idx = prev.findIndex((l) => l._key === key)
      if (idx === -1) return prev
      const clone = { ...prev[idx], _key: crypto.randomUUID(), sort_order: prev.length }
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]
    })
  }

  function removeLine(key: string) {
    if (isStructureLocked) return
    setLines((prev) => prev.filter((l) => l._key !== key))
  }

  function moveLineUp(key: string) {
    if (isStructureLocked) return
    setLines((prev) => {
      const idx = prev.findIndex((l) => l._key === key)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveLineDown(key: string) {
    if (isStructureLocked) return
    setLines((prev) => {
      const idx = prev.findIndex((l) => l._key === key)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  // Base totals (full line amounts)
  const baseTotals = useMemo(() => {
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

  // Sum of all deposits already invoiced for this campaign
  const totalDepositsHt = useMemo(() => {
    if (!depositInvoices) return 0
    return depositInvoices
      .filter((d) => !isNew || d.id !== id) // exclude current if editing
      .reduce((sum, d) => sum + d.total_ht, 0)
  }, [depositInvoices, isNew, id])

  // Final totals adjusted for invoice type
  const totals = useMemo(() => {
    if (invoiceType === 'acompte') {
      const ratio = (depositPercentage || 0) / 100
      return {
        totalHt: Math.round(baseTotals.totalHt * ratio * 100) / 100,
        totalTva: Math.round(baseTotals.totalTva * ratio * 100) / 100,
        totalTtc: Math.round(baseTotals.totalTtc * ratio * 100) / 100,
        tvaByRate: Object.fromEntries(
          Object.entries(baseTotals.tvaByRate).map(([rate, amt]) => [rate, Math.round(amt * ratio * 100) / 100]),
        ),
      }
    }
    if (invoiceType === 'solde') {
      const remainingHt = Math.max(0, baseTotals.totalHt - totalDepositsHt)
      const remainingRatio = baseTotals.totalHt > 0 ? remainingHt / baseTotals.totalHt : 0
      return {
        totalHt: Math.round(remainingHt * 100) / 100,
        totalTva: Math.round(baseTotals.totalTva * remainingRatio * 100) / 100,
        totalTtc: Math.round((remainingHt + baseTotals.totalTva * remainingRatio) * 100) / 100,
        tvaByRate: Object.fromEntries(
          Object.entries(baseTotals.tvaByRate).map(([rate, amt]) => [rate, Math.round(amt * remainingRatio * 100) / 100]),
        ),
      }
    }
    return baseTotals
  }, [invoiceType, baseTotals, depositPercentage, totalDepositsHt])

  // Payment tracking
  const totalPaid = useMemo(() => {
    if (!payments) return 0
    return payments.reduce((sum, p) => sum + p.amount, 0)
  }, [payments])

  const remainingToPay = Math.max(0, Math.round((totals.totalTtc - totalPaid) * 100) / 100)

  const hasAnyDiscount = lines.some((l) => l.discount_value && l.discount_value > 0)

  async function handleAddPayment() {
    if (!id || isNew) return
    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) { toast('Montant invalide', 'error'); return }
    try {
      await createPayment.mutateAsync({
        invoice_id: id,
        amount,
        payment_method: paymentForm.method,
        payment_date: paymentForm.date,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null,
      })
      // Auto-mark as paid if fully paid
      if (amount >= remainingToPay && invoice && invoice.status !== 'paid') {
        await updateInvoice.mutateAsync({ id, status: 'paid', paid_at: paymentForm.date })
      }
      setPaymentForm({ amount: '', method: 'virement', date: new Date().toISOString().split('T')[0], reference: '', notes: '' })
      setShowPaymentForm(false)
      toast('Paiement enregistré')
    } catch {
      toast('Erreur', 'error')
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!id) return
    try {
      await deletePayment.mutateAsync({ id: paymentId, invoiceId: id })
      // If status was paid, revert to sent
      if (invoice?.status === 'paid') {
        await updateInvoice.mutateAsync({ id, status: 'sent', paid_at: null })
      }
      toast('Paiement supprimé')
    } catch {
      toast('Erreur', 'error')
    }
  }

  async function handleCreateCreditNote() {
    if (!invoice || !settings) return
    setSaving(true)
    try {
      const { data: num, error: rpcError } = await supabase.rpc('get_next_invoice_number')
      let finalNumber: string
      if (rpcError || !num) {
        const prefix = settings.invoice_prefix ?? 'F'
        const nextNum = settings.next_invoice_number ?? 1
        const now = new Date()
        const yy = String(now.getFullYear() % 100).padStart(2, '0')
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        finalNumber = `${prefix}-${yy}${mm}-${String(nextNum).padStart(4, '0')}`
      } else {
        finalNumber = num
      }

      const result = await createInvoice.mutateAsync({
        invoice_number: finalNumber,
        client_id: clientId,
        campaign_id: campaignId || null,
        quote_id: invoice.quote_id || null,
        status: 'draft',
        invoice_type: 'avoir',
        deposit_percentage: null,
        deposit_invoice_id: null,
        credit_note_for_id: id ?? null,
        payment_terms: paymentTerms,
        issued_at: new Date().toISOString().split('T')[0],
        due_at: new Date().toISOString().split('T')[0],
        paid_at: null,
        notes: `Avoir sur facture ${invoice.invoice_number}`,
        client_reference: clientReference || null,
        created_by: profile?.id ?? null,
      })

      // Copy lines with negative amounts
      await saveLines.mutateAsync({
        invoiceId: result.id,
        lines: lines.filter((l) => l.description.trim()).map((l, i) => ({
          invoice_id: result.id,
          service_catalog_id: l.service_catalog_id ?? null,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: -Math.abs(l.unit_price),
          tva_rate: l.tva_rate,
          discount_type: l.discount_type ?? null,
          discount_value: l.discount_value ?? 0,
          line_type: l.line_type ?? 'item',
          total_ht: -Math.abs(l.total_ht),
          sort_order: i,
        })),
      })

      toast('Avoir créé')
      navigate(`/admin/invoices/${result.id}`)
    } catch {
      toast('Erreur lors de la création de l\'avoir', 'error')
    } finally {
      setSaving(false)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})

  async function handleSave() {
    if (isCancelled) return
    const errors: Record<string, boolean> = {}
    if (!clientId) errors.clientId = true
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast('Veuillez remplir les champs obligatoires', 'error')
      return
    }
    setValidationErrors({})
    setSaving(true)
    try {
      let invoiceId = id!

      if (isNew) {
        const { data: invoiceNumber, error: rpcError } = await supabase.rpc('get_next_invoice_number')
        let finalNumber: string
        if (rpcError || !invoiceNumber) {
          const prefix = settings?.invoice_prefix ?? 'F'
          const nextNum = settings?.next_invoice_number ?? 1
          const now = new Date()
          const yy = String(now.getFullYear() % 100).padStart(2, '0')
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          finalNumber = `${prefix}-${yy}${mm}-${String(nextNum).padStart(4, '0')}`
        } else {
          finalNumber = invoiceNumber
        }

        const result = await createInvoice.mutateAsync({
          invoice_number: finalNumber,
          client_id: clientId,
          campaign_id: campaignId,
          quote_id: quoteId || null,
          status: 'draft',
          invoice_type: invoiceType,
          deposit_percentage: invoiceType === 'acompte' ? depositPercentage : null,
          deposit_invoice_id: invoiceType === 'solde' && depositInvoiceId ? depositInvoiceId : null,
          credit_note_for_id: null,
          payment_terms: paymentTerms,
          issued_at: issuedAt || new Date().toISOString().split('T')[0],
          due_at: dueAt || computeDueDate(issuedAt, paymentTerms),
          paid_at: null,
          notes: notes || null,
          client_reference: clientReference || null,
          created_by: profile?.id ?? null,
        })
        invoiceId = result.id

        // Auto-convert source quote status to 'converted'
        if (quoteId) {
          await updateQuote.mutateAsync({ id: quoteId, status: 'converted' })
        }
      } else {
        await updateInvoice.mutateAsync({
          id: invoiceId,
          client_id: clientId,
          campaign_id: campaignId,
          invoice_type: invoiceType,
          deposit_percentage: invoiceType === 'acompte' ? depositPercentage : null,
          deposit_invoice_id: invoiceType === 'solde' && depositInvoiceId ? depositInvoiceId : null,
          payment_terms: paymentTerms,
          notes: notes || null,
          client_reference: clientReference || null,
          due_at: dueAt || undefined,
        })
      }

      await saveLines.mutateAsync({
        invoiceId,
        lines: lines
          .filter((l) => l.description.trim())
          .map((l, i) => ({
            invoice_id: invoiceId,
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

      if (isNew) {
        const num = lines.length > 0 ? ` — ${lines.filter((l) => l.description.trim()).length} ligne${lines.filter((l) => l.description.trim()).length > 1 ? 's' : ''}` : ''
        toast(`Facture créée${num}`)
        navigate(`/admin/invoices/${invoiceId}`, { replace: true })
      } else {
        toast('Facture mise à jour')
      }
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: InvoiceStatus) {
    if (!id || isNew) return
    try {
      const updates: Record<string, unknown> = { id, status: newStatus }
      if (newStatus === 'paid') updates.paid_at = new Date().toISOString()
      await updateInvoice.mutateAsync(updates as { id: string; status: InvoiceStatus; paid_at?: string })
      toast(`Facture marquée comme "${INVOICE_STATUS_CONFIG[newStatus].label}"`)
    } catch {
      toast('Erreur', 'error')
    }
  }

  async function handleDownloadPDF() {
    if (!invoice || !clientData || !settings) {
      toast('Données manquantes pour le PDF', 'error')
      return
    }
    try {
      const depositInvNumber = invoice.deposit_invoice_id && depositInvoices
        ? depositInvoices.find((d) => d.id === invoice.deposit_invoice_id)?.invoice_number ?? null
        : null
      const qrCode = settings.iban ? await generateEPCQR({
        name: settings.company_name ?? 'OOHMYAD',
        iban: settings.iban,
        bic: settings.bic ?? undefined,
        amount: totals.totalTtc,
        reference: invoice.invoice_number,
      }) : null
      const invoiceForPdf = {
        ...invoice,
        invoice_type: (invoice.invoice_type as 'standard' | 'acompte' | 'solde' | 'avoir') ?? 'standard',
        deposit_invoice_number: depositInvNumber,
      }
      const blob = await pdf(
        <InvoicePDF
          invoice={invoiceForPdf}
          quoteNumber={sourceQuote?.quote_number}
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
          qrCodeDataUrl={qrCode}
        />,
      ).toBlob()
      saveAs(blob, `${invoice.invoice_number}.pdf`)
    } catch {
      toast('Erreur lors de la génération du PDF', 'error')
    }
  }

  async function handlePreviewPDF() {
    if (!invoice || !clientData || !settings) {
      toast('Données manquantes pour le PDF', 'error')
      return
    }
    try {
      const depositInvNumber = invoice.deposit_invoice_id && depositInvoices
        ? depositInvoices.find((d) => d.id === invoice.deposit_invoice_id)?.invoice_number ?? null
        : null
      const qrCode = settings.iban ? await generateEPCQR({
        name: settings.company_name ?? 'OOHMYAD',
        iban: settings.iban,
        bic: settings.bic ?? undefined,
        amount: totals.totalTtc,
        reference: invoice.invoice_number,
      }) : null
      const invoiceForPdf = {
        ...invoice,
        invoice_type: (invoice.invoice_type as 'standard' | 'acompte' | 'solde' | 'avoir') ?? 'standard',
        deposit_invoice_number: depositInvNumber,
      }
      const blob = await pdf(
        <InvoicePDF
          invoice={invoiceForPdf}
          quoteNumber={sourceQuote?.quote_number}
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
          qrCodeDataUrl={qrCode}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch {
      toast('Erreur lors de la génération du PDF', 'error')
    }
  }

  function handleMailto() {
    if (!invoice || !clientData || !settings) return
    const subject = encodeURIComponent(`Facture ${invoice.invoice_number}`)
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint la facture ${invoice.invoice_number} d'un montant de ${formatCurrency(totals.totalTtc)} TTC.\n\nÉchéance : ${new Date(invoice.due_at).toLocaleDateString('fr-FR')}\n\n${settings.iban ? `Règlement par virement :\nIBAN : ${settings.iban}${settings.bic ? `\nBIC : ${settings.bic}` : ''}\n\n` : ''}Cordialement,\n${settings.company_name ?? 'OOHMYAD'}`,
    )
    const to = clientData.contact_email ? encodeURIComponent(clientData.contact_email) : ''
    window.open(`mailto:${to}?subject=${subject}&body=${body}`)
  }

  async function handleDuplicate() {
    if (!invoice || !settings) return
    setSaving(true)
    try {
      const { data: num, error: rpcError } = await supabase.rpc('get_next_invoice_number')
      let finalNumber: string
      if (rpcError || !num) {
        const prefix = settings.invoice_prefix ?? 'F'
        const nextNum = settings.next_invoice_number ?? 1
        const now = new Date()
        const yy = String(now.getFullYear() % 100).padStart(2, '0')
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        finalNumber = `${prefix}-${yy}${mm}-${String(nextNum).padStart(4, '0')}`
      } else {
        finalNumber = num
      }

      const result = await createInvoice.mutateAsync({
        invoice_number: finalNumber,
        client_id: clientId,
        campaign_id: campaignId || null,
        quote_id: null,
        status: 'draft',
        invoice_type: 'standard',
        deposit_percentage: null,
        deposit_invoice_id: null,
        credit_note_for_id: null,
        payment_terms: paymentTerms,
        issued_at: new Date().toISOString().split('T')[0],
        due_at: computeDueDate(new Date().toISOString().split('T')[0], paymentTerms),
        paid_at: null,
        notes: notes || null,
        client_reference: clientReference || null,
        created_by: profile?.id ?? null,
      })

      await saveLines.mutateAsync({
        invoiceId: result.id,
        lines: lines.filter((l) => l.description.trim()).map((l, i) => ({
          invoice_id: result.id,
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

      toast('Facture dupliquée')
      navigate(`/admin/invoices/${result.id}`)
    } catch {
      toast('Erreur lors de la duplication', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && (invoiceLoading || linesLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeClients = clients?.filter((c) => c.is_active) ?? []
  const linkedQuoteId = quoteId || invoice?.quote_id

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/invoices')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold">
              {isNew ? 'Nouvelle facture' : invoice?.invoice_number ?? ''}
            </h1>
            {!isNew && invoice?.invoice_type && invoice.invoice_type !== 'standard' && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {INVOICE_TYPE_LABELS[invoice.invoice_type as InvoiceType]}{invoice.invoice_type === 'acompte' && invoice.deposit_percentage ? ` ${invoice.deposit_percentage}%` : ''}
              </span>
            )}
            {!isNew && invoice && (
              <Badge variant={INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus]?.variant ?? 'secondary'}>
                {INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus]?.label ?? invoice.status}
              </Badge>
            )}
          </div>
          {linkedQuoteId && sourceQuote && (
            <Link to={`/admin/quotes/${linkedQuoteId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <FileText className="size-3" /> Depuis devis {sourceQuote.quote_number}
            </Link>
          )}
        </div>

        {/* Status actions — visible directly in header */}
        {!isNew && invoice?.status === 'draft' && (
          <Button size="sm" onClick={() => handleStatusChange('sent')}>
            <Send className="mr-1.5 size-3.5" /> Envoyer
          </Button>
        )}
        {!isNew && invoice?.status === 'sent' && (
          <Button size="sm" onClick={() => handleStatusChange('paid')}>
            <Check className="mr-1.5 size-3.5" /> Payée
          </Button>
        )}
        {!isNew && invoice?.status === 'overdue' && (
          <Button size="sm" onClick={() => handleStatusChange('paid')}>
            <Check className="mr-1.5 size-3.5" /> Payée
          </Button>
        )}

        {/* Primary actions */}
        {!isNew && invoice && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={handlePreviewPDF}>
              <Eye className="mr-1.5 size-3.5" /> Aperçu
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-1.5 size-3.5" /> PDF
            </Button>

            {/* More actions dropdown */}
            <div className="relative">
              <Button size="sm" variant="ghost" onClick={() => setShowActionsMenu((v) => !v)}>
                <MoreHorizontal className="size-4" />
              </Button>
              {showActionsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-background py-1 shadow-lg">
                    <button onClick={() => { handleDuplicate(); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                      <Copy className="size-3.5" /> Dupliquer
                    </button>
                    {invoice.public_token && (
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/view/${invoice.public_token}`); toast('Lien copié'); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                        <ExternalLink className="size-3.5" /> Copier le lien public
                      </button>
                    )}
                    {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                      <button onClick={() => { handleMailto(); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                        <Mail className="size-3.5" /> Relancer par email
                      </button>
                    )}
                    {invoice.status !== 'draft' && invoice.status !== 'cancelled' && invoice.invoice_type !== 'avoir' && (
                      <button onClick={() => { handleCreateCreditNote(); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                        <Ban className="size-3.5" /> Émettre un avoir
                      </button>
                    )}
                    {invoice.status === 'draft' && (
                      <button onClick={() => { handleStatusChange('cancelled'); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted">
                        <Ban className="size-3.5" /> Annuler la facture
                      </button>
                    )}
                    {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                      <>
                        <button onClick={() => { handleStatusChange('overdue'); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-muted">
                          En retard
                        </button>
                        <button onClick={() => { handleStatusChange('cancelled'); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted">
                          <Ban className="size-3.5" /> Annuler
                        </button>
                      </>
                    )}
                    {invoice.status === 'overdue' && (
                      <button onClick={() => { handleStatusChange('sent' as InvoiceStatus); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                        <Send className="size-3.5" /> Repasser en envoyée
                      </button>
                    )}
                    {['paid', 'cancelled'].includes(invoice.status) && !invoice.is_archived && (
                      <button onClick={() => { updateInvoice.mutateAsync({ id: id!, is_archived: true }).then(() => toast('Facture archivée')); setShowActionsMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                        <Archive className="size-3.5" /> Archiver
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Dialog */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
          <div className="relative h-[90vh] w-[90vw] max-w-4xl rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-medium">Aperçu — {invoice?.invoice_number}</p>
              <Button size="sm" variant="ghost" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
                <X className="size-4" />
              </Button>
            </div>
            <iframe src={previewUrl} className="h-[calc(100%-3.5rem)] w-full rounded-b-lg" />
          </div>
        </div>
      )}

      {/* From quote banner */}
      {isNew && sourceQuote && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-600">
          <FileText className="mr-1.5 inline size-3.5" />
          Pré-rempli depuis le devis <strong>{sourceQuote.quote_number}</strong> — vérifiez les informations avant d'enregistrer.
        </div>
      )}

      {/* Locked banners */}
      {isCancelled && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          Cette facture est annulée et ne peut plus être modifiée.
        </div>
      )}
      {isStructureLocked && !isCancelled && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-600">
          Facture en statut « {INVOICE_STATUS_CONFIG[invoice!.status as InvoiceStatus]?.label} ». Seules les descriptions des lignes et les notes sont modifiables.
        </div>
      )}


      {/* Facturation — single compact card */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Row 1: Client | Campagne | Type */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Client *</label>
              <select
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setValidationErrors((v) => ({ ...v, clientId: false })) }}
                disabled={isStructureLocked}
                className={`flex h-9 w-full rounded-lg border bg-background px-3 text-sm disabled:opacity-50 ${validationErrors.clientId ? 'border-red-500 ring-1 ring-red-500/30' : 'border-input'}`}
              >
                <option value="">Sélectionner un client...</option>
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
                disabled={isStructureLocked || !clientId}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50"
              >
                <option value="">{!clientId ? 'Client d\u2019abord' : campaignsLoading ? 'Chargement...' : 'Aucune (optionnel)'}</option>
                {clientCampaigns?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <div className="flex h-9 items-center gap-1.5">
                {(['standard', 'acompte', 'solde'] as InvoiceType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => !isStructureLocked && setInvoiceType(t)}
                    disabled={isStructureLocked}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      invoiceType === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {INVOICE_TYPE_LABELS[t].replace('Facture ', '').replace("d'", '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conditional: Acompte % */}
          {invoiceType === 'acompte' && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-2.5">
              <label className="text-xs font-medium">Acompte</label>
              <div className="flex items-center gap-1">
                <Input type="number" min={1} max={100} step={1} value={depositPercentage} onChange={(e) => setDepositPercentage(Math.max(1, Math.min(100, parseFloat(e.target.value) || 1)))} disabled={isStructureLocked} className="h-7 w-16 text-sm" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{formatCurrency(baseTotals.totalTtc * (depositPercentage || 0) / 100)} TTC</span>
            </div>
          )}

          {/* Conditional: Solde summary */}
          {invoiceType === 'solde' && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium">Factures d'acompte liées</p>
              {!campaignId && (
                <p className="text-xs text-muted-foreground">Sélectionnez une campagne pour voir les acomptes liés.</p>
              )}
              {campaignId && (!depositInvoices || depositInvoices.length === 0) && (
                <p className="text-xs text-muted-foreground">Pas d'acomptes enregistrés — le solde sera calculé sur la base des lignes.</p>
              )}
              {depositInvoices && depositInvoices.length > 0 && (
                <>
                  <div className="space-y-1">
                    {depositInvoices.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded bg-background px-3 py-1.5 text-sm">
                        <span>{d.invoice_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {d.deposit_percentage}% — {formatCurrency(d.total_ttc)} TTC
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-sm font-medium">Total acomptes</span>
                    <span className="text-sm font-medium">{formatCurrency(totalDepositsHt)} HT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Solde restant</span>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(totals.totalTtc)} TTC</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Row 2: Dates + terms + ref */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date d'émission</label>
              <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} disabled={isStructureLocked} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Conditions</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)} disabled={isStructureLocked} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-50">
                {PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>{PAYMENT_TERMS_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Échéance</label>
              <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} disabled={isStructureLocked} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Réf. dossier</label>
              <Input value={clientReference} onChange={(e) => setClientReference(e.target.value)} disabled={isCancelled} placeholder="Ex: 25090548" className="h-9 text-sm" />
            </div>
          </div>

          {/* Row 3: Notes — full width */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <p className="text-[10px] text-muted-foreground/70">Affiché sur le PDF de la facture, visible par le client.</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isCancelled} placeholder="Conditions particulières, informations complémentaires..." rows={2} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Lignes de la facture</p>
            {!isStructureLocked && (
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="mr-1 size-3.5" /> Ligne
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="min-w-[200px] px-2 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="w-20 px-2 py-2 font-medium text-muted-foreground">Qté</th>
                  <th className="w-24 px-2 py-2 font-medium text-muted-foreground">Unité</th>
                  <th className="w-24 px-2 py-2 font-medium text-muted-foreground">PU HT</th>
                  {(hasAnyDiscount || !isStructureLocked) && <th className="w-28 px-2 py-2 font-medium text-muted-foreground">Remise</th>}
                  <th className="w-20 px-2 py-2 font-medium text-muted-foreground">TVA %</th>
                  <th className="w-24 px-2 py-2 text-right font-medium text-muted-foreground">Total HT</th>
                  {!isStructureLocked && <th className="w-20" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line._key} className={`border-b border-border/50 ${!line.description.trim() ? 'bg-muted/20 opacity-60' : ''}`}>
                    <td className="px-2 py-1.5">
                      <LineDescriptionEditor
                        value={line.description}
                        onChange={(v) => updateLine(line._key, 'description', v)}
                        onSelectCatalog={isStructureLocked ? undefined : (sel) => updateLineFromCatalog(line._key, sel)}
                        services={isStructureLocked ? undefined : (services ?? undefined)}
                        disabled={isCancelled}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(line._key, 'quantity', parseFloat(e.target.value) || 0)}
                        disabled={isStructureLocked}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.unit}
                        onChange={(e) => updateLine(line._key, 'unit', e.target.value)}
                        disabled={isStructureLocked}
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
                        disabled={isStructureLocked}
                        className="h-8 text-sm"
                      />
                    </td>
                    {(hasAnyDiscount || !isStructureLocked) && (
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
                            disabled={isStructureLocked}
                            placeholder="—"
                            className="h-8 w-16 text-sm"
                          />
                          <select
                            value={line.discount_type ?? ''}
                            onChange={(e) => updateLine(line._key, 'discount_type', e.target.value || null)}
                            disabled={isStructureLocked}
                            className="h-8 w-12 rounded-lg border border-input bg-background px-1 text-xs disabled:opacity-50"
                          >
                            <option value="">—</option>
                            <option value="percent">%</option>
                            <option value="amount">€</option>
                          </select>
                        </div>
                      </td>
                    )}
                    <td className="px-2 py-1.5">
                      <select
                        value={line.tva_rate}
                        onChange={(e) => updateLine(line._key, 'tva_rate', parseFloat(e.target.value))}
                        disabled={isStructureLocked}
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
                    {!isStructureLocked && (
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
                    <td colSpan={isStructureLocked ? 6 : 7} className="px-2 py-8 text-center text-muted-foreground">
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
            <div className="w-72 space-y-2 text-sm">
              {invoiceType !== 'standard' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Base HT (lignes)</span>
                  <span className="tabular-nums">{formatCurrency(baseTotals.totalHt)}</span>
                </div>
              )}
              {invoiceType === 'acompte' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Acompte {depositPercentage}%</span>
                  <span className="tabular-nums">× {depositPercentage}%</span>
                </div>
              )}
              {invoiceType === 'solde' && totalDepositsHt > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Acomptes déjà facturés</span>
                  <span className="tabular-nums">−{formatCurrency(totalDepositsHt)}</span>
                </div>
              )}
              {invoiceType !== 'standard' && <Separator />}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{invoiceType === 'standard' ? 'Total HT' : 'Montant HT'}</span>
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

      {/* Payments section */}
      {!isNew && invoice && invoice.invoice_type !== 'avoir' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Paiements</p>
              {!isCancelled && (
                <Button size="sm" variant="outline" onClick={() => setShowPaymentForm((v) => !v)}>
                  <Plus className="mr-1 size-3.5" />
                  {showPaymentForm ? 'Annuler' : 'Ajouter un paiement'}
                </Button>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Payé : {formatCurrency(totalPaid)} / {formatCurrency(totals.totalTtc)}
                </span>
                <span className={remainingToPay <= 0 ? 'font-medium text-green-600' : 'text-muted-foreground'}>
                  {remainingToPay <= 0 ? 'Soldé' : `Reste : ${formatCurrency(remainingToPay)}`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${remainingToPay <= 0 ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, totals.totalTtc > 0 ? (totalPaid / totals.totalTtc) * 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* Payment form */}
            {showPaymentForm && (
              <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Montant *</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder={formatCurrency(remainingToPay)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Méthode</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value as Payment['payment_method'] }))}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Date</label>
                    <Input
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Référence</label>
                    <Input
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                      placeholder="N° virement..."
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleAddPayment} disabled={createPayment.isPending}>
                  {createPayment.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Enregistrer le paiement
                </Button>
              </div>
            )}

            {/* Payment list */}
            {payments && payments.length > 0 && (
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50">
                    <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {PAYMENT_METHOD_LABELS[p.payment_method]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString('fr-FR')}
                    </span>
                    {p.reference && (
                      <span className="text-xs text-muted-foreground">Réf. {p.reference}</span>
                    )}
                    <span className="flex-1" />
                    {!isCancelled && (
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {!isNew && <DocumentAttachments documentType="invoice" documentId={id} disabled={isCancelled} />}

      {/* Spacer for sticky bar */}
      {!isCancelled && <div className="h-16" />}

      {/* Sticky save bar */}
      {!isCancelled && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Total TTC :</span>{' '}
              <span className="text-lg font-bold tabular-nums">{formatCurrency(totals.totalTtc)}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/admin/invoices')}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || !clientId}>
                {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                {isNew ? 'Créer la facture' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
