import { useState, useRef } from 'react'
import { Camera, X, Loader2, RotateCcw } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
  onPhotoUploaded: (storagePath: string) => void
  folder: string
  className?: string
  required?: boolean
}

export function PhotoCapture({
  onPhotoUploaded,
  folder,
  className,
}: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingFileRef = useRef<File | null>(null)

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB before compression

  async function uploadFile(compressed: File) {
    setError(null)
    setUploading(true)

    try {
      // Upload to Supabase Storage
      const timestamp = Date.now()
      const ext = compressed.name.split('.').pop() || 'jpg'
      const path = `${folder}/${timestamp}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('panel-photos')
        .upload(path, compressed, {
          contentType: compressed.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      pendingFileRef.current = null
      onPhotoUploaded(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WebP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Fichier trop volumineux (max 20 Mo)')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Compress image
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })

      // Keep compressed file for potential retry
      pendingFileRef.current = compressed

      // Preview
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(compressed)

      await uploadFile(compressed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
      setUploading(false)
    }
  }

  async function handleRetry() {
    if (!pendingFileRef.current) return
    await uploadFile(pendingFileRef.current)
  }

  function handleRemove() {
    setPreview(null)
    setError(null)
    pendingFileRef.current = null
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('space-y-2', className)}>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Aperçu"
            className="h-48 w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            aria-label="Supprimer la photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Compression et upload...</span>
            </>
          ) : (
            <>
              <Camera className="h-8 w-8" />
              <span className="text-sm">Prendre une photo</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="flex-1">{error}</p>
          {pendingFileRef.current && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={uploading}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              Réessayer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
