import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePanel, useUpdatePanel } from '@/hooks/usePanels'
import { useLocation as useLocationData, useLocationPanels, useLocationContract, useContractAmendments } from '@/hooks/useLocations'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/shared/Toast'
import { PANEL_FORMATS, PANEL_TYPES, PANEL_STATUS_CONFIG, PHOTO_TYPE_LABELS, PANEL_ZONES, PANEL_PROBLEMS, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'
import type { PanelStatus, PhotoType } from '@/lib/constants'
import { searchPlaces, type PlaceSuggestion } from '@/lib/google-places'
import { isValidUUID } from '@/lib/utils'
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
  CircleAlert,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  FileText,
  PanelTop,
  FileCheck,
  Download,
  Zap,
  CircleOff,
  Unlink,
  Droplets,
  EyeOff,
} from 'lucide-react'


export function OperatorPanelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const validId = isValidUUID(id) ? id : undefined
  const { data: panel, isLoading } = usePanel(validId)
  const updatePanel = useUpdatePanel()

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries()
  }, [queryClient])

  // Location data
  const { data: location } = useLocationData(panel?.location_id ?? undefined)
  const { data: locationPanels } = useLocationPanels(panel?.location_id ?? undefined)
  const { data: locationContract } = useLocationContract(panel?.location_id ?? undefined)
  const { data: amendments } = useContractAmendments(locationContract?.id)

  const [editing, setEditing] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportProblem, setReportProblem] = useState<string | null>(null)
  const [reportNote, setReportNote] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
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
        .select('*, campaigns(name, client_id, clients:clients(company_name), start_date, end_date)')
        .eq('panel_id', id!)
        .is('unassigned_at', null)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Campaign visual matching this panel's format
  const activeCampaignId = assignments?.[0]?.campaign_id as string | undefined
  const { data: campaignVisualUrl } = useQuery({
    queryKey: ['campaign-visual', activeCampaignId, panel?.format],
    queryFn: async () => {
      const { data: visuals, error } = await supabase
        .from('campaign_visuals')
        .select('*')
        .eq('campaign_id', activeCampaignId!)
      if (error) throw error
      if (!visuals?.length) return null

      // Resolve format names for visuals that have a panel_format_id
      const formatIds = visuals.map((v) => v.panel_format_id).filter(Boolean) as string[]
      let formatMap: Record<string, string> = {}
      if (formatIds.length > 0) {
        const { data: formats } = await supabase
          .from('panel_formats')
          .select('id, name')
          .in('id', formatIds)
        if (formats) {
          formatMap = Object.fromEntries(formats.map((f) => [f.id, f.name]))
        }
      }

      // Find visual matching this panel's format, or fallback
      const match =
        visuals.find((v) => v.panel_format_id && formatMap[v.panel_format_id] === panel!.format) ??
        visuals.find((v) => !v.panel_format_id) ??
        visuals[0]

      const { data: signed } = await supabase.storage
        .from('campaign-visuals')
        .createSignedUrl(match.storage_path, 3600)
      return signed?.signedUrl ?? null
    },
    enabled: !!activeCampaignId && !!panel?.format,
    staleTime: 30 * 60 * 1000,
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

  // Quick photo upload (no preview — iOS handles its own confirmation)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session || !id) return
    if (photoInputRef.current) photoInputRef.current.value = ''

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast('Format non supporté. Utilisez JPG, PNG ou WebP.', 'error')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast('Fichier trop volumineux (max 20 Mo)', 'error')
      return
    }

    setUploadingPhoto(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })

      const ext = compressed.name.split('.').pop() || 'jpg'
      const path = `${id}/${crypto.randomUUID()}.${ext}`

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
    }
  }

  // Photo viewer + deletion
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const touchStartX = useRef<number | null>(null)

  async function handleDeletePhoto(photoId: string) {
    if (!id) return
    setDeletingPhoto(true)
    try {
      const photo = photos?.find((p) => p.id === photoId)
      if (photo) {
        await supabase.storage.from('panel-photos').remove([photo.storage_path])
        await supabase.from('panel_photos').delete().eq('id', photo.id)
      }
      queryClient.invalidateQueries({ queryKey: ['panel-photos', id] })
      toast('Photo supprimée')
      // Adjust index after deletion
      const visibleCount = getVisiblePhotos().length - 1
      if (visibleCount <= 0) setViewingIndex(null)
      else if (viewingIndex !== null && viewingIndex >= visibleCount) setViewingIndex(visibleCount - 1)
    } catch {
      toast('Erreur lors de la suppression', 'error')
    } finally {
      setDeletingPhoto(false)
      setConfirmDelete(false)
    }
  }

  const PHONE_RE = /^(?:\+?33|0)\s*[1-9](?:[\s.\-]?\d{2}){4}$/

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

  async function handleReportSubmit() {
    if (!id || !reportProblem) return
    const problem = PANEL_PROBLEMS.find((p) => p.value === reportProblem)
    if (!problem) return

    setSubmittingReport(true)
    try {
      const notePrefix = `[${problem.label}]`
      const fullNote = reportNote.trim()
        ? `${notePrefix} ${reportNote.trim()}`
        : notePrefix
      const existingNotes = panel?.notes ? `${panel.notes}\n` : ''

      await updatePanel.mutateAsync({
        id,
        status: problem.status,
        notes: existingNotes + fullNote,
      })
      toast(`Problème signalé : ${problem.label}`)
      setShowReport(false)
      setReportProblem(null)
      setReportNote('')
    } catch {
      toast('Erreur lors du signalement', 'error')
    } finally {
      setSubmittingReport(false)
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

  function getVisiblePhotos() {
    if (!photos || !panel) return []
    const isActive = panel.status === 'active'
    return isActive ? photos : photos.filter((p) => p.photo_type !== 'campaign')
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="bg-background pb-20">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-[15px] font-semibold">{location?.name || panel.name || 'Panneau'}</h1>
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
          </div>
        </div>

        {/* Location banner */}
        {location && (
          <Link
            to={`/app/locations/${location.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors active:bg-muted/60"
          >
            <Landmark className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{location.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {location.city} {location.postal_code}
                {' · '}
                {locationPanels?.length ?? 0} panneau{(locationPanels?.length ?? 0) !== 1 ? 'x' : ''}
                {' · '}
                {location.has_contract ? (
                  <span className="text-green-600">Contrat</span>
                ) : (
                  <span className="text-orange-500">Pas de contrat</span>
                )}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        )}

        {/* Zone label */}
        {panel.zone_label && (
          <div className="flex items-center gap-2 text-[12px]">
            <PanelTop className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground">Zone :</span>
            <span className="font-medium">
              {panel.zone_label?.startsWith('custom:') ? panel.zone_label.slice(7) : PANEL_ZONES.find((z) => z.value === panel.zone_label)?.label ?? panel.zone_label}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className={`grid gap-2 ${panel.contact_phone ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 transition-colors hover:bg-muted disabled:opacity-50"
          >
            {uploadingPhoto ? (
              <Loader2 className="size-4 animate-spin text-blue-500" />
            ) : (
              <Camera className="size-4 text-blue-500" />
            )}
            <span className="text-[11px] font-medium">Vérifier</span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {panel.contact_phone && (
            <a
              href={`tel:${panel.contact_phone}`}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 transition-colors hover:bg-muted"
            >
              <Phone className="size-4 text-emerald-500" />
              <span className="text-[11px] font-medium">Appeler</span>
            </a>
          )}

          <button
            onClick={() => setShowReport(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 transition-colors hover:bg-muted"
          >
            <CircleAlert className="size-4 text-orange-500" />
            <span className="text-[11px] font-medium">Signaler</span>
          </button>

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
                    client_id: string | null
                    clients: { company_name: string } | null
                    start_date: string
                    end_date: string
                  } | null
                  return (
                    <div key={a.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                          <Megaphone className="size-3.5 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{campaign?.name ?? '—'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {campaign?.clients?.company_name ?? ''}
                            {campaign?.start_date && (
                              <> · {new Date(campaign.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              {' → '}
                              {new Date(campaign.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</>
                            )}
                          </p>
                        </div>
                      </div>
                      {campaignVisualUrl && (
                        <img
                          src={campaignVisualUrl}
                          alt="Visuel campagne"
                          className="w-full rounded-lg border border-border object-contain"
                          style={{ maxHeight: 200 }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit form */}
        {editing && (
          <Card className="overflow-visible">
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
                  maxLength={150}
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
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Tél. du lieu</label>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    placeholder="01 23 45 67 89"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="text-[13px]"
                    maxLength={20}
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

        {/* Photos grid — hide campaign photos when panel is vacant */}
        {(() => {
          const visiblePhotos = getVisiblePhotos()
          if (!visiblePhotos.length) return null
          return (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Photos ({visiblePhotos.length})
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {visiblePhotos.map((photo, idx) => {
                const url = photoUrls?.[photo.id]
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => url && setViewingIndex(idx)}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-muted text-left"
                  >
                    {url ? (
                      <img src={url} alt={PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] ?? 'Photo du panneau'} className="size-full object-cover" />
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
                  </button>
                )
              })}
            </div>
          </div>
          )
        })()}

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

        {/* Contract CTA (adaptive) */}
        {(() => {
          // No location → show "create contract" which will also create the location
          if (!panel.location_id) {
            return (
              <Link
                to={`/app/contract/${panel.id}`}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-4 text-[13px] font-medium text-primary transition-colors active:bg-primary/10"
              >
                <FileText className="size-4" />
                Créer le contrat
              </Link>
            )
          }

          // Location exists, no contract
          if (!locationContract) {
            return (
              <Link
                to={`/app/contract/${panel.id}`}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-4 text-[13px] font-medium text-primary transition-colors active:bg-primary/10"
              >
                <FileText className="size-4" />
                Créer le contrat
              </Link>
            )
          }

          // Contract exists, check if this panel is included
          const panelsInContract = (locationContract.panels_snapshot as Array<{ panel_id: string }>) ?? []
          const isIncluded = panelsInContract.some((p) => p.panel_id === panel.id)

          if (isIncluded) {
            return (
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <FileCheck className="size-4 shrink-0 text-green-600" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium">Contrat {locationContract.contract_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Signé le {new Date(locationContract.signed_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                {locationContract.storage_path && (
                  <button
                    onClick={async () => {
                      const { data } = supabase.storage.from('panel-photos').getPublicUrl(locationContract.storage_path!)
                      if (data?.publicUrl) {
                        window.open(data.publicUrl, '_blank')
                      }
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-[12px] font-medium text-primary transition-colors active:bg-muted/50"
                  >
                    <Download className="size-3.5" />
                    Voir le PDF
                  </button>
                )}
                {/* Avenants */}
                {amendments && amendments.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Avenants ({amendments.length})
                    </p>
                    <div className="space-y-2">
                      {amendments.map((amendment) => (
                        <div
                          key={amendment.id}
                          className="flex items-center justify-between rounded-md border border-border p-2.5"
                        >
                          <div>
                            <p className="text-[12px] font-medium">{amendment.amendment_number}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {amendment.reason === 'panel_added' && 'Ajout de panneau'}
                              {amendment.reason === 'panel_removed' && 'Retrait de panneau'}
                              {amendment.reason === 'terms_updated' && 'Modification des termes'}
                              {' · '}
                              {amendment.signed_at
                                ? new Date(amendment.signed_at).toLocaleDateString('fr-FR')
                                : '—'}
                            </p>
                          </div>
                          {amendment.storage_path && (
                            <button
                              onClick={async () => {
                                const { data } = supabase.storage.from('panel-photos').getPublicUrl(amendment.storage_path!)
                                if (data?.publicUrl) {
                                  window.open(data.publicUrl, '_blank')
                                }
                              }}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors active:bg-muted/50"
                            >
                              <Download className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          // Contract exists but panel not included → amendment
          return (
            <Link
              to={`/app/contract/${panel.id}`}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 py-4 text-[13px] font-medium text-blue-600 transition-colors active:bg-blue-500/10"
            >
              <FileText className="size-4" />
              Ajouter à l'avenant
            </Link>
          )
        })()}
      </div>

      {/* Report problem bottom sheet */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowReport(false); setReportProblem(null); setReportNote('') }}
          />
          <div className="relative w-full max-w-lg animate-in slide-in-from-bottom rounded-t-2xl bg-background pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />

            <div className="px-4">
              <p className="text-[15px] font-semibold">Signaler un problème</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Sélectionnez le type de problème rencontré
              </p>

              {/* Problem types */}
              <div className="mt-4 space-y-2">
                {PANEL_PROBLEMS.map((problem) => {
                  const IconMap = { Zap, CircleOff, Unlink, Droplets, EyeOff } as Record<string, typeof Zap>
                  const Icon = IconMap[problem.icon]
                  return (
                    <button
                      key={problem.value}
                      type="button"
                      onClick={() => setReportProblem(problem.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        reportProblem === problem.value
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      {Icon && <Icon className={`size-4 ${reportProblem === problem.value ? 'text-orange-500' : 'text-muted-foreground'}`} />}
                      <span className="text-[13px] font-medium">{problem.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Optional note */}
              {reportProblem && (
                <div className="mt-3 space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Précision (optionnel)
                  </label>
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value.slice(0, 200))}
                    placeholder="Coin supérieur droit fissuré..."
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground"
                    maxLength={200}
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleReportSubmit}
                disabled={!reportProblem || submittingReport}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-[14px] font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                {submittingReport && <Loader2 className="size-4 animate-spin" />}
                Signaler le problème
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen photo viewer with swipe */}
      {viewingIndex !== null && (() => {
        const visiblePhotos = getVisiblePhotos()
        const currentPhoto = visiblePhotos[viewingIndex]
        if (!currentPhoto) return null
        const currentUrl = photoUrls?.[currentPhoto.id]
        const currentType = PHOTO_TYPE_LABELS[currentPhoto.photo_type as PhotoType] ?? currentPhoto.photo_type
        const total = visiblePhotos.length

        function goNext() {
          setViewingIndex((i) => i !== null && i < total - 1 ? i + 1 : i)
          setConfirmDelete(false)
        }
        function goPrev() {
          setViewingIndex((i) => i !== null && i > 0 ? i - 1 : i)
          setConfirmDelete(false)
        }

        return (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            touchStartX.current = null
            if (Math.abs(dx) > 60) {
              if (dx < 0) goNext()
              else goPrev()
            }
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
            <p className="text-[13px] font-medium text-white/70 tabular-nums">
              {viewingIndex + 1} / {total}
            </p>
            <button
              onClick={() => { setViewingIndex(null); setConfirmDelete(false) }}
              className="flex size-11 items-center justify-center rounded-full bg-white/10"
              aria-label="Fermer"
            >
              <X className="size-5 text-white" />
            </button>
          </div>

          {/* Photo + nav arrows */}
          <div className="relative flex flex-1 items-center justify-center px-2">
            {currentUrl ? (
              <img
                key={currentPhoto.id}
                src={currentUrl}
                alt={PHOTO_TYPE_LABELS[currentPhoto.photo_type as PhotoType] ?? 'Photo du panneau'}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : (
              <Loader2 className="size-8 animate-spin text-white/40" />
            )}

            {/* Desktop arrows (hidden on touch) */}
            {viewingIndex > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 min-h-[44px] min-w-[44px] sm:flex"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="size-5 text-white" />
              </button>
            )}
            {viewingIndex < total - 1 && (
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 min-h-[44px] min-w-[44px] sm:flex"
                aria-label="Photo suivante"
              >
                <ChevronRight className="size-5 text-white" />
              </button>
            )}
          </div>

          {/* Info + actions */}
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mb-3 text-center">
              <p className="text-[13px] font-medium text-white">{currentType}</p>
              {currentPhoto.taken_at && (
                <p className="text-[12px] text-white/60">
                  {new Date(currentPhoto.taken_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            {/* Dots indicator */}
            {total > 1 && (
              <div className="mb-3 flex justify-center">
                {visiblePhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setViewingIndex(i); setConfirmDelete(false) }}
                    className="relative flex min-h-[44px] min-w-[44px] items-center justify-center"
                    aria-label={`Photo ${i + 1}`}
                  >
                    <span className={`block size-1.5 rounded-full transition-colors ${i === viewingIndex ? 'bg-white' : 'bg-white/30'}`} />
                  </button>
                ))}
              </div>
            )}

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 py-3 text-[14px] font-medium text-red-400 transition-colors active:bg-red-500/25"
              >
                <Trash2 className="size-4" />
                Supprimer cette photo
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-[13px] text-white/70">Confirmer la suppression ?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deletingPhoto}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 py-3 text-[14px] font-medium text-white transition-colors active:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDeletePhoto(currentPhoto.id)}
                    disabled={deletingPhoto}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-3 text-[14px] font-medium text-white transition-colors active:bg-red-600"
                  >
                    {deletingPhoto ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )
      })()}
    </div>
    </PullToRefresh>
  )
}
