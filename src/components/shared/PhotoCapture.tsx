import { useState, useRef } from 'react'
import { Camera, X, Loader2, RotateCcw, Image as ImageIcon, CloudUpload } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { cn } from '@/lib/utils'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'
import { uploadPhoto } from '@/lib/photo-upload'

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
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const pendingFileRef = useRef<File | null>(null)

  const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES
  const MAX_FILE_SIZE = MAX_IMAGE_SIZE

  async function uploadFile(compressed: File) {
    setError(null)
    setUploading(true)

    try {
      // uploadPhoto : tente l'upload immediat si en ligne, sinon met en queue
      // IndexedDB pour un upload differe. Le path retourne est toujours le
      // path final (queue ou pas).
      const ext = compressed.name.split('.').pop() || 'jpg'
      const result = await uploadPhoto({
        bucket: 'panel-photos',
        folder,
        blob: compressed,
        contentType: compressed.type,
        extension: ext,
      })

      pendingFileRef.current = null
      setQueued(result.queued)
      onPhotoUploaded(result.path)
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
    setQueued(false)
    pendingFileRef.current = null
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
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
          {queued && (
            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-blue-500/95 px-2 py-1 text-[10px] font-medium text-white">
              <CloudUpload className="size-3" />
              En attente d'envoi
            </div>
          )}
        </div>
      ) : uploading ? (
        <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Compression et upload...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Action principale : appareil photo */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Camera className="h-8 w-8" />
            <span className="text-sm font-medium">Prendre une photo</span>
          </button>
          {/* Action secondaire : galerie */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ImageIcon className="h-4 w-4" />
            Choisir depuis la galerie
          </button>
        </div>
      )}

      {/* Input camera : capture force */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Input galerie : pas de capture, ouvre le file picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
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
