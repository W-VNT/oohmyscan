import { useRef } from 'react'
import { useDocumentAttachments, useUploadAttachment, useDeleteAttachment, type DocumentAttachment } from '@/hooks/admin/useDocumentAttachments'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { Paperclip, Upload, Trash2, Download, Loader2, FileText, Image as ImageIcon, File } from 'lucide-react'

interface DocumentAttachmentsProps {
  documentType: 'quote' | 'invoice'
  documentId: string | undefined
  disabled?: boolean
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function FileIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith('image/')) return <ImageIcon className="size-4 text-blue-500" />
  if (mime?.includes('pdf')) return <FileText className="size-4 text-red-500" />
  return <File className="size-4 text-muted-foreground" />
}

export function DocumentAttachments({ documentType, documentId, disabled }: DocumentAttachmentsProps) {
  const { data: attachments } = useDocumentAttachments(documentType, documentId)
  const uploadAttachment = useUploadAttachment()
  const deleteAttachment = useDeleteAttachment()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !documentId) return

    // 10MB max
    if (file.size > 10 * 1024 * 1024) {
      toast('Fichier trop volumineux (max 10 Mo)', 'error')
      return
    }

    try {
      await uploadAttachment.mutateAsync({ documentType, documentId, file })
      toast('Fichier joint')
    } catch {
      toast("Erreur lors de l'upload", 'error')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDownload(att: DocumentAttachment) {
    const { data } = await supabase.storage
      .from('document-attachments')
      .createSignedUrl(att.storage_path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handleDelete(att: DocumentAttachment) {
    try {
      await deleteAttachment.mutateAsync(att)
      toast('Fichier supprimé')
    } catch {
      toast('Erreur', 'error')
    }
  }

  if (!documentId) return null

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Paperclip className="size-4" />
            Pièces jointes
            {attachments && attachments.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({attachments.length})</span>
            )}
          </div>
          {!disabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploadAttachment.isPending}
            >
              {uploadAttachment.isPending ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Upload className="mr-1 size-3.5" />}
              Joindre
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
          />
        </div>

        {attachments && attachments.length > 0 && (
          <div className="space-y-1">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted/50">
                <FileIcon mime={att.mime_type} />
                <span className="flex-1 truncate font-medium">{att.file_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(att.file_size)}
                </span>
                <button
                  onClick={() => handleDownload(att)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Télécharger"
                >
                  <Download className="size-3.5" />
                </button>
                {!disabled && (
                  <button
                    onClick={() => handleDelete(att)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {(!attachments || attachments.length === 0) && (
          <p className="py-2 text-center text-xs text-muted-foreground">Aucune pièce jointe</p>
        )}
      </CardContent>
    </Card>
  )
}
