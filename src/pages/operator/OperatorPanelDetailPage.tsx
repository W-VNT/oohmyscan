import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePanel, useUpdatePanel } from '@/hooks/usePanels'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/shared/Toast'
import { PANEL_FORMATS, PANEL_TYPES, PANEL_STATUS_CONFIG, PHOTO_TYPE_LABELS } from '@/lib/constants'
import type { PanelStatus, PhotoType } from '@/lib/constants'
import { searchPlaces, type PlaceSuggestion } from '@/lib/mapbox'
import imageCompression from 'browser-image-compression'
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Pencil,
  X,
  Camera,
  Megaphone,
  Calendar,
  Phone,
  AlertTriangle,
} from 'lucide-react'


export function OperatorPanelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: panel, isLoading } = usePanel(id)
  const updatePanel = useUpdatePanel()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    contact_phone: '',
    format: '',
    type: '',
    notes: '',
  })

  // Photos for this panel
  const { data: photos } = useQuery({
    queryKey: ['panel-photos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('*')
        .eq('panel_id', id!)
        .order('taken_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Signed URLs for photo thumbnails
  const { data: photoUrls } = useQuery({
    queryKey: ['panel-photo-urls', photos?.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (!photos?.length) return {}
      const urls: Record<string, string> = {}
      await Promise.all(
        photos.map(async (photo) => {
          const { data } = await supabase.storage
            .from('panel-photos')
            .createSignedUrl(photo.storage_path, 3600)
          if (data) urls[photo.id] = data.signedUrl
        })
      )
      return urls
    },
    enabled: !!photos?.length,
    staleTime: 30 * 60 * 1000,
  })

  // Active campaigns on this panel
  const { data: assignments } = useQuery({
    queryKey: ['panel-assignments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, campaigns(name, client, start_date, end_date)')
        .eq('panel_id', id!)
        .is('unassigned_at', null)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (panel) {
      setForm({
        name: panel.name ?? '',
        address: panel.address ?? '',
        city: panel.city ?? '',
        contact_phone: panel.contact_phone ?? '',
        format: panel.format ?? '',
        type: panel.type ?? '',
        notes: panel.notes ?? '',
      })
    }
  }, [panel])

  // Place autocomplete for editing — use device GPS for proximity
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const deviceCoordsRef = useRef<{ lng: number; lat: number } | null>(null)

  // Grab device position when edit mode opens + cleanup debounce
  useEffect(() => {
    if (!editing) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        deviceCoordsRef.current = { lng: pos.coords.longitude, lat: pos.coords.latitude }
      },
      () => {
        if (panel) deviceCoordsRef.current = { lng: panel.lng, lat: panel.lat }
      },
      { enableHighAccuracy: true, timeout: 5000 },
    )
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [editing, panel])

  const handleNameSearch = useCallback((query: string) => {
    setForm((f) => ({ ...f, name: query }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const coords = deviceCoordsRef.current ?? (panel ? { lng: panel.lng, lat: panel.lat } : null)
      if (!coords) return
      setSearchingPlaces(true)
      const results = await searchPlaces(query, coords.lng, coords.lat)
      setSuggestions(results)
      setSearchingPlaces(false)
    }, 300)
  }, [panel])

  function selectSuggestion(place: PlaceSuggestion) {
    setForm((f) => ({
      ...f,
      name: place.name,
      address: place.address,
      city: place.city,
    }))
    setSuggestions([])
  }

  // Quick photo upload with preview
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<{ url: string; file: File } | null>(null)

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoPreview({ url, file })
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  function cancelPhotoPreview() {
    if (photoPreview) URL.revokeObjectURL(photoPreview.url)
    setPhotoPreview(null)
  }

  async function confirmPhotoUpload() {
    if (!photoPreview || !session || !id) return

    setUploadingPhoto(true)
    try {
      const compressed = await imageCompression(photoPreview.file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })

      const ext = compressed.name.split('.').pop() || 'jpg'
      const path = `${id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('panel-photos')
        .upload(path, compressed, { contentType: compressed.type })
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('panel_photos').insert({
        panel_id: id,
        storage_path: path,
        photo_type: 'check',
        taken_by: session.user.id,
        taken_at: new Date().toISOString(),
      })
      if (insertError) throw insertError

      queryClient.invalidateQueries({ queryKey: ['panel-photos', id] })
      toast('Photo ajoutée')
    } catch {
      toast("Erreur lors de l'upload", 'error')
    } finally {
      setUploadingPhoto(false)
      cancelPhotoPreview()
    }
  }

  const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/

  async function handleSave() {
    if (!id) return

    // Validate
    if (form.name && form.name.length > 100) {
      toast('Le nom ne doit pas dépasser 100 caractères', 'error')
      return
    }
    if (form.contact_phone && !PHONE_RE.test(form.contact_phone)) {
      toast('Numéro de téléphone invalide', 'error')
      return
    }
    if (form.notes && form.notes.length > 500) {
      toast('Les notes ne doivent pas dépasser 500 caractères', 'error')
      return
    }

    try {
      await updatePanel.mutateAsync({
        id,
        name: form.name || null,
        address: form.address || null,
        city: form.city || null,
        contact_phone: form.contact_phone || null,
        format: form.format || null,
        type: form.type || null,
        notes: form.notes || null,
      })
      toast('Panneau mis à jour')
      setEditing(false)
    } catch {
      toast('Erreur lors de la mise à jour', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-background pb-20">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-4 p-4">
          <div className="flex gap-3">
            <Skeleton className="size-24 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-12 rounded-md" />
                <Skeleton className="h-5 w-14 rounded-md" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!panel) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Panneau non trouvé</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-sm text-primary underline">
          Retour
        </button>
      </div>
    )
  }

  const status = PANEL_STATUS_CONFIG[panel.status as PanelStatus] ?? PANEL_STATUS_CONFIG.vacant
  const heroPhoto = photos?.[0] ? photoUrls?.[photos[0].id] : null
  const hasCampaign = assignments && assignments.length > 0

  return (
    <div className="bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-[15px] font-semibold">{panel.reference}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`size-2 rounded-full ${status.color}`} />
          <span className="text-[12px] font-medium">{status.label}</span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Hero — photo + info */}
        <div className="flex gap-3">
          {/* Photo principale */}
          <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
            {heroPhoto ? (
              <img src={heroPhoto} alt="Panneau" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Camera className="size-6 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Infos principales */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[15px] font-semibold">
              {panel.name || 'Sans nom'}
            </p>
            {(panel.address || panel.city) && (
              <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{[panel.address, panel.city].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {panel.format && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {panel.format}
                </span>
              )}
              {panel.type && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {panel.type}
                </span>
              )}
            </div>
            {panel.contact_phone && (
              <a
                href={`tel:${panel.contact_phone}`}
                className="inline-flex items-center gap-1 text-[12px] text-primary"
              >
                <Phone className="size-3" />
                {panel.contact_phone}
              </a>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 transition-colors hover:bg-muted"
          >
            {uploadingPhoto ? (
              <Loader2 className="size-4 animate-spin text-blue-500" />
            ) : (
              <Camera className="size-4 text-blue-500" />
            )}
            <span className="text-[11px] font-medium">Photo</span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          <Link
            to={`/scan?mode=campaign`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 transition-colors hover:bg-muted"
          >
            <Megaphone className="size-4 text-emerald-500" />
            <span className="text-[11px] font-medium">Diffuser</span>
          </Link>

          <button
            onClick={() => {
              setEditing(!editing)
              if (panel) {
                setForm({
                  name: panel.name ?? '',
                  address: panel.address ?? '',
                  city: panel.city ?? '',
                  contact_phone: panel.contact_phone ?? '',
                  format: panel.format ?? '',
                  type: panel.type ?? '',
                  notes: panel.notes ?? '',
                })
              }
            }}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 transition-colors hover:bg-muted"
          >
            {editing ? <X className="size-4 text-muted-foreground" /> : <Pencil className="size-4 text-muted-foreground" />}
            <span className="text-[11px] font-medium">{editing ? 'Annuler' : 'Modifier'}</span>
          </button>
        </div>

        {/* Active campaign */}
        {hasCampaign && (
          <Card>
            <CardContent>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Campagne active
              </p>
              <div className="mt-2 space-y-2">
                {assignments.map((a) => {
                  const campaign = (a as Record<string, unknown>).campaigns as {
                    name: string
                    client: string
                    start_date: string
                    end_date: string
                  } | null
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Megaphone className="size-3.5 text-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{campaign?.name ?? '—'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {campaign?.client}
                          {campaign?.start_date && (
                            <> · {new Date(campaign.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            {' → '}
                            {new Date(campaign.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</>
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit form */}
        {editing && (
          <Card>
            <CardContent className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Modifier les informations
              </p>
              <div className="relative space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Nom du lieu</label>
                <div className="relative">
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameSearch(e.target.value)}
                    placeholder="Ex: Boulangerie Dupont"
                    className="text-[13px]"
                    autoComplete="off"
                    maxLength={100}
                  />
                  {searchingPlaces && (
                    <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                    {suggestions.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => selectSuggestion(place)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                      >
                        <MapPin className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{place.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {[place.address, place.city].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Adresse</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Ex: 12 rue de Rivoli"
                  className="text-[13px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Ville</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Paris"
                    className="text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Tél. du lieu</label>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    placeholder="01 23 45 67 89"
                    type="tel"
                    className="text-[13px]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Format</label>
                <div className="flex flex-wrap gap-1.5">
                  {PANEL_FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setForm((s) => ({ ...s, format: s.format === f ? '' : f }))}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        form.format === f
                          ? 'bg-foreground text-background'
                          : 'border border-border bg-background text-foreground'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {PANEL_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((s) => ({ ...s, type: s.type === t ? '' : t }))}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        form.type === t
                          ? 'bg-foreground text-background'
                          : 'border border-border bg-background text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground">Notes</label>
                  <span className={`text-[10px] ${form.notes.length > 450 ? 'text-orange-400' : 'text-muted-foreground/50'}`}>
                    {form.notes.length}/500
                  </span>
                </div>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 500) }))}
                  placeholder="Observations..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={updatePanel.isPending}
                className="w-full"
                size="sm"
              >
                {updatePanel.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Photos grid */}
        {photos && photos.length > 0 && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Photos ({photos.length})
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {photos.map((photo) => {
                const url = photoUrls?.[photo.id]
                return (
                  <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                    {url ? (
                      <img src={url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Loader2 className="size-4 animate-spin text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4">
                      <p className="text-[10px] font-medium text-white">
                        {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] ?? photo.photo_type}
                      </p>
                      {photo.taken_at && (
                        <p className="text-[9px] text-white/70">
                          {new Date(photo.taken_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No photos state */}
        {(!photos || photos.length === 0) && !editing && (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <Camera className="size-6" strokeWidth={1.5} />
            <p className="text-[13px]">Ajouter une photo</p>
          </button>
        )}

        <Separator />

        {/* Details */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Détails
          </p>
          {panel.installed_at && (
            <div className="flex items-center gap-2 text-[12px]">
              <Calendar className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">Installé le</span>
              <span className="ml-auto font-medium">
                {new Date(panel.installed_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[12px]">
            <MapPin className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground">GPS</span>
            <span className="ml-auto font-medium tabular-nums">
              {panel.lat.toFixed(5)}, {panel.lng.toFixed(5)}
            </span>
          </div>
          {panel.last_checked_at && (
            <div className="flex items-center gap-2 text-[12px]">
              <Camera className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">Dernier contrôle</span>
              <span className="ml-auto font-medium">
                {new Date(panel.last_checked_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
          {panel.notes && !editing && (
            <div className="flex items-start gap-2 text-[12px]">
              <AlertTriangle className="mt-0.5 size-3 text-muted-foreground" />
              <span className="text-muted-foreground">Notes</span>
              <span className="ml-auto text-right font-medium">{panel.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Photo preview overlay */}
      {photoPreview && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <img
            src={photoPreview.url}
            alt="Aperçu"
            className="max-h-[60vh] w-full rounded-xl object-contain"
          />
          <p className="mt-3 text-[13px] text-white/70">Vérifiez la photo avant d'envoyer</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={cancelPhotoPreview}
              disabled={uploadingPhoto}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
            >
              <X className="size-4" />
              Reprendre
            </button>
            <button
              onClick={confirmPhotoUpload}
              disabled={uploadingPhoto}
              className="flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-[13px] font-medium text-black transition-colors hover:bg-white/90"
            >
              {uploadingPhoto ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              Valider
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
