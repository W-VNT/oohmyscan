import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCreatePanel } from '@/hooks/usePanels'
import { toast } from '@/components/shared/Toast'
import { useAuth } from '@/hooks/useAuth'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { supabase } from '@/lib/supabase'
import { PANEL_FORMATS, PANEL_TYPES } from '@/lib/constants'

export function RegisterPanelPage() {
  const { panelId } = useParams<{ panelId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { lat, lng, accuracy, loading: gpsLoading, error: gpsError, requestPosition } = useGeolocation()
  const createPanel = useCreatePanel()

  const [form, setForm] = useState({
    name: '',
    format: '',
    type: '',
    notes: '',
  })
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    requestPosition()
  }, [requestPosition])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!lat || !lng) {
      setError('Position GPS requise')
      return
    }
    if (!photoPath) {
      setError('Photo requise')
      return
    }
    if (!panelId) return

    setSubmitting(true)
    setError(null)

    try {
      const reference = `PAN-${Date.now().toString(36).toUpperCase()}`

      const panel = await createPanel.mutateAsync({
        qr_code: panelId,
        reference,
        name: form.name || null,
        lat,
        lng,
        format: form.format || null,
        type: form.type || null,
        notes: form.notes || null,
        status: 'active',
        installed_at: new Date().toISOString(),
        installed_by: session?.user?.id,
        last_checked_at: new Date().toISOString(),
      })

      await supabase.from('panel_photos').insert({
        panel_id: panel.id,
        storage_path: photoPath,
        photo_type: 'installation',
        taken_by: session?.user?.id,
      })

      toast('Panneau enregistré avec succès')
      navigate('/scan', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Nouveau panneau</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        {/* GPS */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Position GPS
          </div>
          {gpsLoading ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Acquisition GPS...
            </div>
          ) : lat && lng ? (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                Position acquise
              </div>
              <p className="text-xs text-muted-foreground">
                {lat.toFixed(6)}, {lng.toFixed(6)}
                {accuracy && ` (±${Math.round(accuracy)}m)`}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              {gpsError && (
                <p className="text-sm text-destructive-foreground">{gpsError}</p>
              )}
              <button
                type="button"
                onClick={requestPosition}
                className="mt-1 text-sm text-primary underline"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>

        {/* Photo */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Photo d'installation *
          </label>
          <PhotoCapture
            folder={`panels/${panelId}`}
            onPhotoUploaded={setPhotoPath}
            required
          />
        </div>

        {/* Format */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
          <select
            value={form.format}
            onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sélectionner un format</option>
            {PANEL_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sélectionner un type</option>
            {PANEL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom / description</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Panneau angle rue de Rivoli"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Observations..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !lat || !lng || !photoPath}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Valider l\'installation'
          )}
        </button>
      </form>
    </div>
  )
}
