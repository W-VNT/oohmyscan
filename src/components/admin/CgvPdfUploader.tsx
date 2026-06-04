import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { Upload, FileText, Trash2, Loader2, ExternalLink } from 'lucide-react'

interface Props {
  currentPath: string | null
  onUploaded: (path: string) => Promise<void> | void
  onRemoved: () => Promise<void> | void
}

const STORAGE_PATH = 'cgv.pdf'

export function CgvPdfUploader({ currentPath, onUploaded, onRemoved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast('Le fichier doit être un PDF', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Le PDF doit faire moins de 10 Mo', 'error')
      return
    }

    setUploading(true)
    try {
      const { error } = await supabase.storage
        .from('company-pdfs')
        .upload(STORAGE_PATH, file, { upsert: true, contentType: 'application/pdf' })
      if (error) throw error
      await onUploaded(STORAGE_PATH)
    } catch (err) {
      console.error(err)
      toast("Échec de l'upload", 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!currentPath) return
    setRemoving(true)
    try {
      await supabase.storage.from('company-pdfs').remove([currentPath])
      await onRemoved()
    } catch (err) {
      console.error(err)
      toast('Échec de la suppression', 'error')
    } finally {
      setRemoving(false)
    }
  }

  async function handleOpen() {
    if (!currentPath) return
    const { data, error } = await supabase.storage
      .from('company-pdfs')
      .createSignedUrl(currentPath, 60)
    if (error || !data?.signedUrl) {
      toast('Impossible de générer le lien', 'error')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-3">
      {currentPath ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-[#F5C400]" />
            <div>
              <p className="text-sm font-medium">PDF CGV actuel</p>
              <p className="text-xs text-muted-foreground">{currentPath}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleOpen}>
              <ExternalLink className="mr-1.5 size-3.5" /> Voir
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRemove} disabled={removing}>
              {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-destructive" />}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 transition-colors hover:border-foreground/30 hover:bg-muted/40"
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {uploading ? 'Upload en cours...' : 'Cliquez pour uploader un PDF'}
          </p>
          <p className="text-xs text-muted-foreground">Max 10 Mo · PDF uniquement</p>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
