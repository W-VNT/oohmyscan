import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCampaign } from '@/hooks/useCampaigns'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { ProofSlidePDF } from '@/lib/pdf/ProofSlidePDF'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCompanySettings } from '@/hooks/admin/useCompanySettings'
import { MiniRichEditor } from '@/components/shared/MiniRichEditor'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  FileDown,
  Loader2,
  X,
  ImageIcon,
  GripVertical,
} from 'lucide-react'

// === TYPES ===

export type SlideElement =
  | { id: string; type: 'logo' }
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'photos'; photoIds: string[]; uploadedUrls: string[]; layout: 1 | 2 | 4 | 8 }
  | { id: string; type: 'map' }
  | { id: string; type: 'table' }
  | { id: string; type: 'kpi'; metrics: [KpiMetric, KpiMetric, KpiMetric] }

export type KpiMetric = 'panels_count' | 'cities_count' | 'photos_count' | 'period' | 'coverage_rate' | 'client'

export type SlideLayout = 'libre' | 'couverture' | 'standard' | 'pleine_image'

const LAYOUT_OPTIONS: { value: SlideLayout; label: string }[] = [
  { value: 'libre', label: 'Libre' },
  { value: 'couverture', label: 'Couverture' },
  { value: 'standard', label: 'Standard' },
  { value: 'pleine_image', label: 'Pleine image' },
]

export type Slide = {
  id: string
  layout: SlideLayout
  elements: SlideElement[]
  bgImageUrl?: string // for pleine_image layout
}

// === DATA HOOKS ===

type PanelAssignment = {
  id: string
  panel_id: string
  assigned_at: string
  panels: {
    id: string
    reference: string
    name: string | null
    city: string | null
    lat: number
    lng: number
  } | null
}

type CampaignPhoto = {
  id: string
  panel_id: string
  storage_path: string
  photo_type: string
  taken_at: string
}

function useCampaignPanels(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['proof-panels', campaignId],
    queryFn: async (): Promise<PanelAssignment[]> => {
      const { data, error } = await supabase
        .from('panel_campaigns')
        .select('*, panels(id, reference, name, city, lat, lng)')
        .eq('campaign_id', campaignId!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data as unknown as PanelAssignment[]
    },
    enabled: !!campaignId,
  })
}

function useCampaignPhotos(panelIds: string[]) {
  return useQuery({
    queryKey: ['proof-photos', panelIds],
    queryFn: async (): Promise<CampaignPhoto[]> => {
      const { data, error } = await supabase
        .from('panel_photos')
        .select('id, panel_id, storage_path, photo_type, taken_at')
        .in('panel_id', panelIds)
        .order('taken_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: panelIds.length > 0,
  })
}

// === SORTABLE SLIDE THUMBNAIL ===

function SlideThumbnail({
  slide,
  index,
  isActive,
  onClick,
  onRemove,
  onDuplicate,
}: {
  slide: Slide
  index: number
  isActive: boolean
  onClick: () => void
  onRemove: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative shrink-0 cursor-grab active:cursor-grabbing"
    >
      <button
        onClick={onClick}
        className={`flex h-20 w-32 flex-col items-center justify-center rounded-lg border-2 text-xs transition-all ${
          isActive
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
        }`}
      >
        <span className="text-[10px] font-medium">Slide {index + 1}</span>
        <span className="mt-0.5 text-[9px] text-muted-foreground">
          {slide.elements.length === 0 ? 'Vide' : `${slide.elements.length} élément${slide.elements.length > 1 ? 's' : ''}`}
        </span>
      </button>

      {/* Actions on hover */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 rounded-b-lg bg-black/60 py-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate() }}
          className="rounded p-1 text-white/70 hover:text-white"
          title="Dupliquer"
        >
          <Copy className="size-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="rounded p-1 text-white/70 hover:text-red-400"
          title="Supprimer"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// === SORTABLE ELEMENT WRAPPER ===

function SortableElement({ id, onRemove, children }: { id: string; onRemove: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group/el relative">
      {/* Drag handle + delete */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover/el:opacity-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          title="Déplacer"
        >
          <GripVertical className="size-3.5" />
        </button>
      </div>
      <button
        onClick={onRemove}
        className="absolute -right-2 -top-2 z-10 rounded-full bg-background p-0.5 text-muted-foreground shadow ring-1 ring-border opacity-0 transition-opacity group-hover/el:opacity-100 hover:text-destructive"
      >
        <X className="size-3" />
      </button>
      {children}
    </div>
  )
}

// === MAIN PAGE ===

export function ProofOfPostingPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()

  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId)
  const { data: assignments = [] } = useCampaignPanels(campaignId)
  const panelIds = assignments.map((a) => a.panel_id)
  const { data: photos = [] } = useCampaignPhotos(panelIds)

  const [slides, setSlides] = useState<Slide[]>(() => [
    { id: 'cover', layout: 'couverture', elements: [] },
  ])
  const [activeSlideId, setActiveSlideId] = useState('cover')
  const [exporting, _setExporting] = useState(false)

  const activeSlide = slides.find((s) => s.id === activeSlideId)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const elementSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSlides((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function addSlide() {
    const id = crypto.randomUUID()
    setSlides((prev) => [...prev, { id, layout: 'standard', elements: [] }])
    setActiveSlideId(id)
  }

  function duplicateSlide(id: string) {
    const source = slides.find((s) => s.id === id)
    if (!source) return
    const newId = crypto.randomUUID()
    const newSlide: Slide = {
      id: newId,
      layout: source.layout,
      elements: source.elements.map((el) => ({ ...el, id: crypto.randomUUID() })),
      bgImageUrl: source.bgImageUrl,
    }
    const idx = slides.findIndex((s) => s.id === id)
    setSlides((prev) => [...prev.slice(0, idx + 1), newSlide, ...prev.slice(idx + 1)])
    setActiveSlideId(newId)
  }

  function removeSlide(id: string) {
    if (slides.length <= 1) { toast('Il faut au moins une slide', 'error'); return }
    setSlides((prev) => prev.filter((s) => s.id !== id))
    if (activeSlideId === id) {
      setActiveSlideId(slides.find((s) => s.id !== id)!.id)
    }
  }

  const { data: settings } = useCompanySettings()

  const kpiData = useMemo(() => {
    const cities = new Set(assignments.map((a) => a.panels?.city).filter(Boolean))
    return {
      panels_count: { value: String(assignments.length), label: 'Panneaux posés' },
      cities_count: { value: String(cities.size), label: 'Villes couvertes' },
      photos_count: { value: String(photos.length), label: 'Photos terrain' },
      period: { value: campaign ? `${new Date(campaign.start_date).toLocaleDateString('fr-FR')} — ${new Date(campaign.end_date).toLocaleDateString('fr-FR')}` : '', label: 'Période' },
      coverage_rate: { value: campaign?.target_panel_count ? `${Math.round((assignments.length / campaign.target_panel_count) * 100)}%` : '—', label: 'Taux de couverture' },
      client: { value: campaign?.clients?.company_name ?? '', label: 'Client' },
    } as Record<KpiMetric, { value: string; label: string }>
  }, [assignments, photos, campaign])

  const logoUrl = useMemo(() => {
    if (!settings?.logo_path) return null
    return supabase.storage.from('company-assets').getPublicUrl(settings.logo_path).data.publicUrl
  }, [settings?.logo_path])

  function getPhotoUrl(path: string) {
    return supabase.storage.from('panel-photos').getPublicUrl(path).data.publicUrl
  }

  function updateElement(elementId: string, updates: Partial<SlideElement>) {
    setSlides((prev) => prev.map((s) =>
      s.id === activeSlideId
        ? { ...s, elements: s.elements.map((el) => el.id === elementId ? { ...el, ...updates } as SlideElement : el) }
        : s
    ))
  }

  function handleElementDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !activeSlide) return
    setSlides((prev) => prev.map((s) => {
      if (s.id !== activeSlideId) return s
      const oldIndex = s.elements.findIndex((el) => el.id === active.id)
      const newIndex = s.elements.findIndex((el) => el.id === over.id)
      return { ...s, elements: arrayMove(s.elements, oldIndex, newIndex) }
    }))
  }

  function removeElement(elementId: string) {
    setSlides((prev) => prev.map((s) =>
      s.id === activeSlideId
        ? { ...s, elements: s.elements.filter((el) => el.id !== elementId) }
        : s
    ))
  }

  async function handleExport() {
    if (!campaign || !settings) return
    _setExporting(true)
    try {
      const blob = await pdf(
        <ProofSlidePDF
          slides={slides}
          kpiData={kpiData}
          logoUrl={logoUrl}
          companyName={settings.company_name ?? 'OOH MY AD !'}
          campaignName={campaign.name}
          getPhotoUrl={getPhotoUrl}
          photos={photos}
          assignments={assignments as Parameters<typeof ProofSlidePDF>[0]['assignments']}
        />,
      ).toBlob()
      saveAs(blob, `justificatif-${campaign.name.replace(/\s+/g, '-')}.pdf`)
      toast('PDF exporté')
    } catch (err) {
      console.error('PDF export error:', err)
      toast("Erreur lors de l'export", 'error')
    } finally {
      _setExporting(false)
    }
  }

  if (campaignLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  if (!campaign) {
    return <div className="py-20 text-center text-muted-foreground">Campagne non trouvée</div>
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Compact header bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <button onClick={() => navigate(`/admin/campaigns/${campaignId}`)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold">Justificatif de pose</span>
          <span className="ml-2 text-xs text-muted-foreground">{campaign.name}</span>
        </div>
        <Button size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <FileDown className="mr-1.5 size-3.5" />}
          Exporter PDF
        </Button>
      </div>

      {/* Slide strip (thumbnails) */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-2 overflow-x-auto">
              {slides.map((slide, i) => (
                <SlideThumbnail
                  key={slide.id}
                  slide={slide}
                  index={i}
                  isActive={slide.id === activeSlideId}
                  onClick={() => setActiveSlideId(slide.id)}
                  onRemove={() => removeSlide(slide.id)}
                  onDuplicate={() => duplicateSlide(slide.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={addSlide}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <Plus className="size-5" />
          <span className="mt-0.5 text-[9px]">Slide</span>
        </button>
      </div>

      {/* Layout selector + Slide editor */}
      <div className="flex-1 overflow-auto py-3 px-4">
        {activeSlide && (
          <>
            {/* Layout selector */}
            <div className="mx-auto mb-2 flex max-w-5xl items-center gap-3">
              <span className="text-xs text-muted-foreground">Gabarit :</span>
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSlides((prev) => prev.map((s) => s.id === activeSlideId ? { ...s, layout: opt.value } : s))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeSlide.layout === opt.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {opt.label}
                </button>
              ))}
              {activeSlide.layout === 'pleine_image' && (
                <label className="ml-auto cursor-pointer rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  {activeSlide.bgImageUrl ? 'Changer image' : 'Choisir image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const url = URL.createObjectURL(file)
                    setSlides((prev) => prev.map((s) => s.id === activeSlideId ? { ...s, bgImageUrl: url } : s))
                  }} />
                </label>
              )}
            </div>

            {/* Slide canvas */}
            <div className={`mx-auto aspect-[297/210] max-h-full w-full max-w-5xl overflow-auto rounded-xl border-2 border-border shadow-sm relative ${
              activeSlide.layout === 'pleine_image' && activeSlide.bgImageUrl ? '' : 'bg-white dark:bg-card'
            }`}>
              {/* Background image for pleine_image */}
              {activeSlide.layout === 'pleine_image' && activeSlide.bgImageUrl && (
                <img src={activeSlide.bgImageUrl} alt="" className="absolute inset-0 size-full object-cover rounded-xl" />
              )}

              {/* Layout wrapper */}
              <div className={`relative flex h-full flex-col ${activeSlide.layout === 'pleine_image' ? 'bg-black/30 rounded-xl' : ''}`}>
                {/* Header bar (couverture + standard) */}
                {(activeSlide.layout === 'couverture' || activeSlide.layout === 'standard') && (
                  <div className={`flex items-center px-8 py-4 ${activeSlide.layout === 'couverture' ? 'justify-center' : 'justify-between'}`}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className={activeSlide.layout === 'couverture' ? 'h-14 object-contain' : 'h-8 object-contain'} />
                    ) : (
                      <div className="flex h-8 w-24 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">Logo</div>
                    )}
                    {activeSlide.layout === 'standard' && campaign && (
                      <span className="text-xs text-muted-foreground">{campaign.name}</span>
                    )}
                  </div>
                )}

                {/* Content area */}
                <div className={`flex-1 px-8 ${
                  activeSlide.layout === 'couverture' ? 'flex flex-col items-center justify-center text-center' :
                  activeSlide.layout === 'pleine_image' ? 'flex flex-col items-center justify-center text-center text-white' :
                  'py-4'
                }`}>
                  {activeSlide.elements.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center ${activeSlide.layout === 'libre' ? 'h-full' : ''} text-muted-foreground`}>
                      <p className="text-sm">Slide vide</p>
                      <p className="mt-1 text-xs">Ajoutez des éléments depuis la barre ci-dessous</p>
              </div>
            ) : (
              <DndContext sensors={elementSensors} collisionDetection={closestCenter} onDragEnd={handleElementDragEnd}>
                <SortableContext items={activeSlide.elements.map((el) => el.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {activeSlide.elements.map((el) => (
                      <SortableElement key={el.id} id={el.id} onRemove={() => removeElement(el.id)}>

                    {/* Logo */}
                    {el.type === 'logo' && (
                      <div className="py-2">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
                        ) : (
                          <div className="flex h-12 w-40 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                            Logo (paramètres)
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text */}
                    {el.type === 'text' && (
                      <MiniRichEditor
                        value={el.content}
                        onChange={(html) => updateElement(el.id, { content: html })}
                        placeholder="Saisissez du texte..."
                      />
                    )}

                    {/* Photos */}
                    {el.type === 'photos' && (() => {
                      const selectedTerrainPhotos = photos.filter((p) => el.photoIds.includes(p.id))
                      const allUrls = [
                        ...selectedTerrainPhotos.map((p) => getPhotoUrl(p.storage_path)),
                        ...el.uploadedUrls,
                      ]
                      const gridCols = el.layout <= 2 ? 'grid-cols-2' : 'grid-cols-4'

                      return (
                        <div className="space-y-3">
                          {/* Controls */}
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={el.layout}
                              onChange={(e) => updateElement(el.id, { layout: parseInt(e.target.value) as 1 | 2 | 4 | 8 })}
                              className="h-7 rounded-lg border border-input bg-background px-2 text-xs"
                            >
                              <option value={1}>1 photo</option>
                              <option value={2}>2 photos</option>
                              <option value={4}>4 photos</option>
                              <option value={8}>8 photos</option>
                            </select>
                            <span className="text-xs text-muted-foreground">{allUrls.length} photo{allUrls.length !== 1 ? 's' : ''}</span>
                            <div className="ml-auto flex gap-1">
                              {photos.length > 0 && (
                                <>
                                  <button onClick={() => updateElement(el.id, { photoIds: photos.map((p) => p.id) })} className="rounded px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10">Tout terrain</button>
                                  <button onClick={() => updateElement(el.id, { photoIds: [] })} className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted">Aucune</button>
                                </>
                              )}
                              <label className="cursor-pointer rounded px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10">
                                + Importer
                                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                                  const files = e.target.files
                                  if (!files) return
                                  const urls: string[] = []
                                  for (let i = 0; i < files.length; i++) {
                                    urls.push(URL.createObjectURL(files[i]))
                                  }
                                  updateElement(el.id, { uploadedUrls: [...el.uploadedUrls, ...urls] })
                                  e.target.value = ''
                                }} />
                              </label>
                            </div>
                          </div>

                          {/* Photo grid preview */}
                          {allUrls.length > 0 ? (
                            <div className={`grid gap-2 ${gridCols}`}>
                              {allUrls.slice(0, el.layout).map((url, i) => (
                                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                                  <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center rounded-md border border-dashed border-border py-8 text-xs text-muted-foreground">
                              <ImageIcon className="mr-2 size-4" /> Sélectionnez ou importez des photos
                            </div>
                          )}

                          {/* Terrain photos selector (collapsed) */}
                          {photos.length > 0 && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Photos terrain ({photos.length})</summary>
                              <div className="mt-2 grid grid-cols-6 gap-1">
                                {photos.map((photo) => {
                                  const selected = el.photoIds.includes(photo.id)
                                  return (
                                    <button
                                      key={photo.id}
                                      onClick={() => {
                                        const next = selected ? el.photoIds.filter((id) => id !== photo.id) : [...el.photoIds, photo.id]
                                        updateElement(el.id, { photoIds: next })
                                      }}
                                      className={`relative aspect-square overflow-hidden rounded border-2 transition-all ${selected ? 'border-primary' : 'border-transparent opacity-40 hover:opacity-70'}`}
                                    >
                                      <img src={getPhotoUrl(photo.storage_path)} alt="" className="size-full object-cover" loading="lazy" />
                                    </button>
                                  )
                                })}
                              </div>
                            </details>
                          )}
                        </div>
                      )
                    })()}

                    {/* KPI */}
                    {el.type === 'kpi' && (
                      <div className="grid grid-cols-3 gap-3">
                        {el.metrics.map((metric, i) => (
                          <div key={i} className="rounded-lg border border-border p-4 text-center">
                            <p className="text-3xl font-bold">{kpiData[metric]?.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{kpiData[metric]?.label}</p>
                            <select
                              value={metric}
                              onChange={(e) => {
                                const next = [...el.metrics] as [KpiMetric, KpiMetric, KpiMetric]
                                next[i] = e.target.value as KpiMetric
                                updateElement(el.id, { metrics: next })
                              }}
                              className="mt-2 h-6 w-full rounded border border-input bg-background px-1 text-[10px] text-muted-foreground"
                            >
                              <option value="panels_count">Panneaux posés</option>
                              <option value="cities_count">Villes couvertes</option>
                              <option value="photos_count">Photos terrain</option>
                              <option value="period">Période</option>
                              <option value="coverage_rate">Taux de couverture</option>
                              <option value="client">Client</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Table */}
                    {el.type === 'table' && (
                      <div className="overflow-hidden rounded-md border border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50 text-left">
                              <th className="px-2 py-1.5 font-medium text-muted-foreground">Réf.</th>
                              <th className="px-2 py-1.5 font-medium text-muted-foreground">Nom</th>
                              <th className="px-2 py-1.5 font-medium text-muted-foreground">Ville</th>
                              <th className="px-2 py-1.5 font-medium text-muted-foreground">Date pose</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {assignments.map((a) => (
                              <tr key={a.id}>
                                <td className="px-2 py-1 font-medium">{a.panels?.reference ?? '—'}</td>
                                <td className="px-2 py-1 text-muted-foreground">{a.panels?.name ?? '—'}</td>
                                <td className="px-2 py-1 text-muted-foreground">{a.panels?.city ?? '—'}</td>
                                <td className="px-2 py-1 text-muted-foreground">{new Date(a.assigned_at).toLocaleDateString('fr-FR')}</td>
                              </tr>
                            ))}
                            {assignments.length === 0 && (
                              <tr><td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">Aucun panneau assigné</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Map */}
                    {el.type === 'map' && (() => {
                      const MAPBOX = import.meta.env.VITE_MAPBOX_TOKEN
                      const coords = assignments.filter((a) => a.panels?.lat && a.panels?.lng).map((a) => a.panels!)
                      if (!MAPBOX || coords.length === 0) {
                        return <div className="flex items-center justify-center rounded-md border border-dashed border-border py-8 text-xs text-muted-foreground">Carte non disponible</div>
                      }
                      const markers = coords.map((p) => `pin-s+2563EB(${p.lng},${p.lat})`).join(',')
                      const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${markers}/auto/800x400@2x?padding=40&access_token=${MAPBOX}`
                      return <img src={mapUrl} alt="Carte" className="w-full rounded-md" />
                    })()}
                      </SortableElement>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
                </div>

                {/* Footer (couverture + standard) */}
                {(activeSlide.layout === 'couverture' || activeSlide.layout === 'standard') && (
                  <div className="flex items-center justify-between border-t border-border/30 px-8 py-3 text-[10px] text-muted-foreground">
                    <span>{settings?.company_name ?? 'OOH MY AD !'}</span>
                    <span>{campaign?.name}</span>
                    <span>Slide {slides.findIndex((s) => s.id === activeSlideId) + 1} / {slides.length}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Element toolbar (bottom) */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">Ajouter :</span>
        {([
          { type: 'text' as const, label: 'Texte' },
          { type: 'photos' as const, label: 'Photos' },
          { type: 'kpi' as const, label: 'KPI' },
          { type: 'table' as const, label: 'Tableau' },
          { type: 'map' as const, label: 'Carte' },
          { type: 'logo' as const, label: 'Logo' },
        ]).map((item) => (
          <Button
            key={item.type}
            size="sm"
            variant="outline"
            onClick={() => {
              if (!activeSlide) return
              const id = crypto.randomUUID()
              let element: SlideElement
              switch (item.type) {
                case 'text': element = { id, type: 'text', content: '' }; break
                case 'photos': element = { id, type: 'photos', photoIds: photos.map((p) => p.id), uploadedUrls: [], layout: 4 }; break
                case 'kpi': element = { id, type: 'kpi', metrics: ['panels_count', 'cities_count', 'photos_count'] }; break
                case 'table': element = { id, type: 'table' }; break
                case 'map': element = { id, type: 'map' }; break
                case 'logo': element = { id, type: 'logo' }; break
              }
              setSlides((prev) => prev.map((s) =>
                s.id === activeSlideId ? { ...s, elements: [...s.elements, element] } : s
              ))
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
