import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/Toast'
import { Loader2, Send, X, Paperclip } from 'lucide-react'

const RichTextEditor = lazy(() => import('@/components/admin/RichTextEditor').then((m) => ({ default: m.RichTextEditor })))

interface SendDocumentModalProps {
  open: boolean
  onClose: () => void
  onSent: () => void
  documentType: 'quote' | 'invoice'
  clientEmail: string | null
  defaultSubject: string
  defaultBody: string
  pdfBlob: Blob | null
  pdfFilename: string
}

/** Replace template variables in a string */
function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value)
  }
  return result
}

export function SendDocumentModal({
  open,
  onClose,
  onSent,
  documentType,
  clientEmail,
  defaultSubject,
  defaultBody,
  pdfBlob,
  pdfFilename,
}: SendDocumentModalProps) {
  const [to, setTo] = useState(clientEmail ?? '')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [attachPdf, setAttachPdf] = useState(true)
  const [sending, setSending] = useState(false)

  // Sync defaults when modal opens
  useEffect(() => {
    if (open) {
      setTo(clientEmail ?? '')
      setSubject(defaultSubject)
      setBody(defaultBody)
      setAttachPdf(true)
    }
  }, [open, clientEmail, defaultSubject, defaultBody])

  if (!open) return null

  async function handleSend() {
    if (!to.trim()) { toast('Veuillez saisir un destinataire', 'error'); return }
    if (!subject.trim()) { toast('Veuillez saisir un objet', 'error'); return }

    setSending(true)
    try {
      // Convert PDF blob to base64 if attaching
      let pdfBase64: string | null = null
      if (attachPdf && pdfBlob) {
        const buffer = await pdfBlob.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        pdfBase64 = btoa(binary)
      }

      const { data, error } = await supabase.functions.invoke('send-document-email', {
        body: {
          to: to.trim(),
          subject: subject.trim(),
          html: body,
          pdfBase64,
          pdfFilename: attachPdf ? pdfFilename : null,
        },
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || "Erreur lors de l'appel à la fonction d'envoi")
      }
      if (data?.error) throw new Error(data.error)

      toast(`Email envoyé à ${to}`)
      onSent()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'envoi"
      toast(message, 'error')
    } finally {
      setSending(false)
    }
  }

  const typeLabel = documentType === 'quote' ? 'devis' : 'facture'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-sm font-semibold">Envoyer le {typeLabel}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Destinataire</label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@client.com"
              className="text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Objet</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Votre ${typeLabel}...`}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Corps du mail</label>
            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}>
              <RichTextEditor
                content={body}
                onChange={setBody}
                placeholder="Bonjour..."
              />
            </Suspense>
          </div>

          {pdfBlob && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="size-4 rounded border-input"
              />
              <Paperclip className="size-3.5 text-muted-foreground" />
              Joindre le PDF ({pdfFilename})
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Send className="mr-2 size-3.5" />}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  )
}

export { replaceVars }
