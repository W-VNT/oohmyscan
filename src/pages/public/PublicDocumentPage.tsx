import { useParams } from 'react-router-dom'
import { usePublicDocument } from '@/hooks/usePublicDocument'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Receipt } from 'lucide-react'
import { QUOTE_STATUS_CONFIG, INVOICE_STATUS_CONFIG, INVOICE_TYPE_LABELS, type QuoteStatus, type InvoiceStatus, type InvoiceType } from '@/lib/constants'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function PublicDocumentPage() {
  const { token } = useParams<{ token: string }>()
  const { data: doc, isLoading, isError } = usePublicDocument(token)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="max-w-sm">
          <CardContent className="text-center">
            <FileText className="mx-auto size-12 text-muted-foreground" />
            <h1 className="mt-4 text-lg font-semibold">Document introuvable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce lien n'est pas valide ou le document n'existe plus.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (doc.type === 'quote') {
    const q = doc.data
    const config = QUOTE_STATUS_CONFIG[q.status as QuoteStatus]
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <h1 className="text-lg font-semibold">Devis {q.quote_number}</h1>
              </div>
              <Badge variant={config?.variant ?? 'secondary'}>
                {config?.label ?? q.status}
              </Badge>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date d'émission</span>
                <span>{new Date(q.issued_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valide jusqu'au</span>
                <span>{new Date(q.valid_until).toLocaleDateString('fr-FR')}</span>
              </div>
              {q.client_reference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Réf. dossier</span>
                  <span>{q.client_reference}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-medium">{formatCurrency(q.total_ht)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total TTC</span>
                <span className="text-primary">{formatCurrency(q.total_ttc)}</span>
              </div>
            </div>

            {q.notes && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm">{q.notes}</p>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Pour obtenir le PDF complet, contactez votre interlocuteur commercial.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invoice
  const inv = doc.data
  const invConfig = INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">
                  {INVOICE_TYPE_LABELS[inv.invoice_type as InvoiceType] ?? 'Facture'} {inv.invoice_number}
                </h1>
              </div>
            </div>
            <Badge variant={invConfig?.variant ?? 'secondary'}>
              {invConfig?.label ?? inv.status}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date d'émission</span>
              <span>{new Date(inv.issued_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Échéance</span>
              <span>{new Date(inv.due_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {inv.client_reference && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Réf. dossier</span>
                <span>{inv.client_reference}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-medium">{formatCurrency(inv.total_ht)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span className="text-primary">{formatCurrency(inv.total_ttc)}</span>
            </div>
          </div>

          {inv.status === 'paid' && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
              Cette facture a été payée.
            </div>
          )}

          {inv.notes && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm">{inv.notes}</p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Pour obtenir le PDF complet ou effectuer le paiement, contactez votre interlocuteur commercial.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
