import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Download,
  Trash2,
  Plus,
  Copy,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Save,
  Image as ImageIcon,
  GripVertical,
  Share2,
  Link as LinkIcon,
  CircleOff,
} from 'lucide-react'
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import {
  useCampaignReport,
  useAutosaveCampaignReport,
  useDeleteCampaignReport,
  useCreateOrReplaceCampaignReport,
  usePublishCampaignReport,
  useUnpublishCampaignReport,
} from '@/hooks/admin/useCampaignReport'
import { useCampaignReportData } from '@/hooks/admin/useCampaignReportData'
import { useCampaign } from '@/hooks/useCampaigns'
import { generateReportFromTemplate } from '@/lib/campaign-report-generator'
import type { BrandedSlide, PhotoFullSlide } from '@/lib/campaign-report-types'
import { SlideCanvas } from '@/components/admin/reports/slides/SlideCanvas'
import { SlideView, getSlideLabel } from '@/components/admin/reports/slides/SlideViews'
import { SlideEditor } from '@/components/admin/reports/slides/SlideEditors'
import { BrandColorPicker } from '@/components/admin/reports/BrandColorPicker'
import { BrandColorProvider } from '@/lib/brand-color-context'
import { BRAND_RED } from '@/lib/report-brand'

const THUMB_SCALE = 0.13
const PREVIEW_SCALE_BASE = 0.6

export function CampaignReportEditorPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()

  const { data: campaign } = useCampaign(campaignId)
  const { data: report, isLoading: reportLoading } = useCampaignReport(campaignId)
  const { data: reportData } = useCampaignReportData(campaignId)
  const createReport = useCreateOrReplaceCampaignReport()
  const deleteReport = useDeleteCampaignReport()
  const publishReport = usePublishCampaignReport()
  const unpublishReport = useUnpublishCampaignReport()
  const confirm = useConfirm()

  const [slides, setSlides] = useState<BrandedSlide[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [introText, setIntroText] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState<string>(BRAND_RED)
  const [exporting, setExporting] = useState(false)
  const [previewScale, setPreviewScale] = useState(PREVIEW_SCALE_BASE)
  const [mobilePreviewScale, setMobilePreviewScale] = useState(0.25)

  // Charge les slides depuis le rapport en DB
  // Cascade brand color : override rapport > default settings > BRAND_RED
  useEffect(() => {
    if (report) {
      setSlides((report.slides as BrandedSlide[]) ?? [])
      setIntroText(report.intro_text)
      setBrandColor(report.brand_color || reportData?.defaultBrandColor || BRAND_RED)
    }
  }, [report, reportData?.defaultBrandColor])

  // Resize : ajuste le scale de la preview pour rentrer dans la zone visible
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const mobilePreviewContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function adjustScale() {
      const el = previewContainerRef.current
      if (el) {
        const targetW = el.clientWidth - 64
        const targetH = el.clientHeight - 64
        const scaleW = targetW / 1414
        const scaleH = targetH / 1000
        setPreviewScale(Math.max(0.2, Math.min(0.9, Math.min(scaleW, scaleH))))
      }
      const mEl = mobilePreviewContainerRef.current
      if (mEl) {
        const targetW = mEl.clientWidth - 16
        setMobilePreviewScale(Math.max(0.18, Math.min(0.5, targetW / 1414)))
      }
    }
    adjustScale()
    window.addEventListener('resize', adjustScale)
    return () => window.removeEventListener('resize', adjustScale)
  }, [slides.length])

  // Autosave
  const autosave = useAutosaveCampaignReport(
    report?.id,
    slides,
    introText,
    brandColor,
    slides.length > 0,
    1000,
  )

  const activeSlide = slides[activeIdx]

  // Drag & drop des thumbnails
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = slides.findIndex((s) => s.id === active.id)
    const newIndex = slides.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    setSlides((prev) => arrayMove(prev, oldIndex, newIndex))
    // Si la slide active change d'index, on suit le mouvement
    if (activeIdx === oldIndex) setActiveIdx(newIndex)
    else if (activeIdx > oldIndex && activeIdx <= newIndex) setActiveIdx(activeIdx - 1)
    else if (activeIdx < oldIndex && activeIdx >= newIndex) setActiveIdx(activeIdx + 1)
  }

  function patchActive(updated: BrandedSlide) {
    setSlides((prev) => prev.map((s, i) => (i === activeIdx ? updated : s)))
  }

  function addPhotoSlide() {
    if (!reportData) return
    // Trouve une photo non utilisee
    const usedPaths = new Set(
      slides
        .filter((s): s is PhotoFullSlide => s.type === 'photo_full')
        .map((s) => s.data.photoPath),
    )
    let firstUnused: { storage_path: string; panel_id: string } | null = null
    for (const [, photos] of reportData.photosByPanelId) {
      const best = photos.find((p) => p.photo_type === 'installation') ?? photos[0]
      if (best && !usedPaths.has(best.storage_path)) {
        firstUnused = best
        break
      }
    }
    if (!firstUnused) {
      toast('Aucune photo supplementaire disponible', 'error')
      return
    }
    const newSlide: PhotoFullSlide = {
      id: `slide-photo-${crypto.randomUUID()}`,
      type: 'photo_full',
      customized: true,
      data: { photoPath: firstUnused.storage_path, region: null, caption: null },
    }
    const insertAt = activeIdx + 1
    setSlides((prev) => [...prev.slice(0, insertAt), newSlide, ...prev.slice(insertAt)])
    setActiveIdx(insertAt)
  }

  function duplicate(idx: number) {
    const source = slides[idx]
    if (!source) return
    const copy: BrandedSlide = JSON.parse(JSON.stringify(source))
    copy.id = `${source.type}-${crypto.randomUUID()}`
    copy.customized = true
    setSlides((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)])
    setActiveIdx(idx + 1)
  }

  function remove(idx: number) {
    if (slides.length <= 1) {
      toast('Le rapport doit contenir au moins une slide', 'error')
      return
    }
    setSlides((prev) => prev.filter((_, i) => i !== idx))
    setActiveIdx(Math.max(0, idx - 1))
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= slides.length) return
    setSlides((prev) => {
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
    setActiveIdx(target)
  }

  async function handleRegenerate() {
    if (!reportData || !campaignId) return
    const ok = await confirm({
      title: 'Régénérer le rapport ?',
      description: 'Régénérer depuis le modèle va écraser toutes les modifications manuelles. Cette action est irréversible.',
      confirmLabel: 'Régénérer',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      const newSlides = generateReportFromTemplate(reportData, {
        coverPhotoPath: report?.cover_photo_path ?? null,
        introTextOverride: introText ?? undefined,
      })
      await createReport.mutateAsync({
        campaign_id: campaignId,
        slides: newSlides,
        intro_text: introText,
        cover_photo_path: report?.cover_photo_path ?? null,
      })
      toast('Rapport regenere')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur', 'error')
    }
  }

  async function handleDelete() {
    if (!report) return
    const ok = await confirm({
      title: 'Supprimer le rapport ?',
      description: 'Toutes les slides et le PDF publié seront supprimés. Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteReport.mutateAsync({ id: report.id, campaign_id: report.campaign_id })
      toast('Rapport supprime')
      navigate(`/admin/campaigns/${campaignId}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur', 'error')
    }
  }

  const publicReportUrl = report?.public_token
    ? `${window.location.origin}/view/rapport/${report.public_token}`
    : null
  const isPublished = !!report?.published_pdf_path

  async function handlePublish() {
    if (!report) return
    try {
      await publishReport.mutateAsync({ report, slides, brandColor })
      if (publicReportUrl) {
        await navigator.clipboard.writeText(publicReportUrl).catch(() => {})
      }
      toast('Rapport publié — lien copié')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur de publication', 'error')
    }
  }

  async function handleUnpublish() {
    if (!report) return
    const ok = await confirm({
      title: 'Dépublier le rapport ?',
      description: 'Le lien public cessera de fonctionner immédiatement. Le rapport reste éditable en interne.',
      confirmLabel: 'Dépublier',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await unpublishReport.mutateAsync(report)
      toast('Rapport dépublié')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur', 'error')
    }
  }

  async function handleCopyLink() {
    if (!publicReportUrl) return
    try {
      await navigator.clipboard.writeText(publicReportUrl)
      toast('Lien copié')
    } catch {
      toast('Impossible de copier — copie manuelle requise', 'error')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { exportBrandedReport } = await import('@/lib/pdf/BrandedReportPDF')
      const blob = await exportBrandedReport(slides, brandColor)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rapport-${campaign?.name?.replace(/\s+/g, '-') ?? 'campagne'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('PDF exporte')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur PDF', 'error')
    } finally {
      setExporting(false)
    }
  }

  const saveStatus = useMemo(() => {
    if (autosave.isSaving) return { text: 'Enregistrement…', tone: 'saving' as const }
    if (autosave.error) return { text: 'Erreur de sauvegarde', tone: 'error' as const }
    if (autosave.lastSavedAt) return { text: `Enregistre ${formatRelative(autosave.lastSavedAt)}`, tone: 'saved' as const }
    return { text: 'Pret', tone: 'idle' as const }
  }, [autosave.isSaving, autosave.error, autosave.lastSavedAt])

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun rapport n'a encore ete genere pour cette campagne.
        </p>
        <Link
          to={`/admin/campaigns/${campaignId}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Retour a la campagne
        </Link>
      </div>
    )
  }

  return (
    <BrandColorProvider color={brandColor}>
    <div className="flex h-full flex-col bg-muted/30">
      {/* Top bar (responsive : mobile = back + nom + export, desktop = tout) */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to={`/admin/campaigns/${campaignId}`}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Retour campagne"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{campaign?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Rapport campagne</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop only */}
          <div className="hidden items-center gap-3 lg:flex">
            <SaveIndicator status={saveStatus} />
            <BrandColorPicker value={brandColor} onChange={setBrandColor} />
            {isPublished ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <LinkIcon className="mr-1.5 size-3.5" />
                  Copier le lien
                </Button>
                <Button variant="outline" size="sm" onClick={handlePublish} disabled={publishReport.isPending}>
                  {publishReport.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Share2 className="mr-1.5 size-3.5" />}
                  Mettre à jour
                </Button>
                <Button variant="outline" size="sm" onClick={handleUnpublish} disabled={unpublishReport.isPending} className="text-destructive">
                  <CircleOff className="mr-1.5 size-3.5" />
                  Dépublier
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handlePublish} disabled={publishReport.isPending}>
                {publishReport.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Share2 className="mr-1.5 size-3.5" />}
                Publier
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRegenerate}>
              <Sparkles className="mr-1.5 size-3.5" />
              Regenerer
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-1.5 size-3.5" />
              Supprimer
            </Button>
          </div>
          {/* Export PDF : visible partout */}
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Download className="mr-1.5 size-3.5" />}
            <span className="hidden sm:inline">Exporter </span>PDF
          </Button>
        </div>
      </div>

      {/* MOBILE editor : thumbnails scrollables → preview → actions → édition */}
      <div className="flex flex-1 flex-col overflow-y-auto lg:hidden">
        {/* Thumbnails strip sticky */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 px-2 py-2">
            <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {slides.length} slide{slides.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`relative shrink-0 overflow-hidden rounded border-2 transition-colors ${
                    idx === activeIdx ? 'border-primary' : 'border-border'
                  }`}
                  style={{ width: 80, height: 56 }}
                >
                  <div className="absolute inset-0 overflow-hidden bg-white">
                    <SlideCanvas scale={80 / 1414}>
                      <SlideView slide={slide} />
                    </SlideCanvas>
                  </div>
                  <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[9px] font-medium text-white">
                    {idx + 1}
                  </span>
                  {slide.customized && (
                    <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-orange-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview mobile */}
        <div ref={mobilePreviewContainerRef} className="flex justify-center p-2">
          {activeSlide ? (
            <div className="overflow-hidden rounded-md shadow-lg ring-1 ring-black/10">
              <SlideCanvas scale={mobilePreviewScale}>
                <SlideView slide={activeSlide} />
              </SlideCanvas>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <ImageIcon className="mx-auto size-10" />
              <p className="mt-2 text-sm">Aucune slide</p>
            </div>
          )}
        </div>

        {/* Actions slide active */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-border bg-background px-3 py-2">
          <Button size="sm" variant="outline" onClick={() => move(activeIdx, -1)} disabled={activeIdx === 0} aria-label="Monter">
            <ChevronUp className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => move(activeIdx, 1)} disabled={activeIdx === slides.length - 1} aria-label="Descendre">
            <ChevronDown className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => duplicate(activeIdx)}>
            <Copy className="mr-1 size-3.5" /> Dupliquer
          </Button>
          <Button size="sm" variant="outline" onClick={() => remove(activeIdx)} className="text-destructive">
            <Trash2 className="mr-1 size-3.5" /> Suppr.
          </Button>
          <Button size="sm" onClick={addPhotoSlide}>
            <Plus className="mr-1 size-3.5" /> Photo
          </Button>
        </div>

        {/* Éditeur de la slide active */}
        {activeSlide && (
          <div className="border-t border-border bg-background px-3 py-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Édition · {getSlideLabel(activeSlide)}
            </p>
            <SlideEditor slide={activeSlide} onChange={patchActive} />
          </div>
        )}

        {/* Actions globales en bas */}
        <div className="space-y-3 border-t border-border bg-background px-3 py-3 pb-6">
          <div className="flex items-center justify-between gap-3">
            <SaveIndicator status={saveStatus} />
            <BrandColorPicker value={brandColor} onChange={setBrandColor} />
          </div>
          {/* Publication */}
          {isPublished ? (
            <div className="space-y-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400">
                <Share2 className="size-3.5" />
                Rapport publié
                {report?.published_at && (
                  <span className="text-muted-foreground">· {new Date(report.published_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyLink} className="flex-1">
                  <LinkIcon className="mr-1.5 size-3.5" />
                  Copier le lien
                </Button>
                <Button size="sm" variant="outline" onClick={handlePublish} disabled={publishReport.isPending}>
                  {publishReport.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                </Button>
                <Button size="sm" variant="outline" onClick={handleUnpublish} disabled={unpublishReport.isPending} className="text-destructive">
                  <CircleOff className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={handlePublish} disabled={publishReport.isPending} className="w-full">
              {publishReport.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Share2 className="mr-1.5 size-3.5" />}
              Publier &amp; copier le lien
            </Button>
          )}
          <div className="flex w-full gap-2">
            <Button variant="outline" size="sm" onClick={handleRegenerate} className="flex-1">
              <Sparkles className="mr-1.5 size-3.5" />
              Régénérer
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="flex-1 text-destructive">
              <Trash2 className="mr-1.5 size-3.5" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Body desktop : sidebar thumbnails | preview | edit panel */}
      <div className="hidden flex-1 overflow-hidden lg:flex">
        {/* Sidebar thumbnails */}
        <aside className="flex w-56 flex-col border-r border-border bg-background">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Slides ({slides.length})
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={slides.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {slides.map((slide, idx) => (
                  <SortableThumb
                    key={slide.id}
                    slide={slide}
                    idx={idx}
                    isActive={idx === activeIdx}
                    onClick={() => setActiveIdx(idx)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="border-t border-border p-2">
            <Button variant="outline" size="sm" onClick={addPhotoSlide} className="w-full">
              <Plus className="mr-1.5 size-3.5" />
              Ajouter une photo
            </Button>
          </div>
        </aside>

        {/* Preview centrale */}
        <main ref={previewContainerRef} className="flex flex-1 items-center justify-center overflow-auto p-8">
          {activeSlide ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-md shadow-2xl ring-1 ring-black/10">
                <SlideCanvas scale={previewScale}>
                  <SlideView slide={activeSlide} />
                </SlideCanvas>
              </div>

              {/* Actions slide active */}
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => move(activeIdx, -1)} disabled={activeIdx === 0}>
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(activeIdx, 1)} disabled={activeIdx === slides.length - 1}>
                  <ChevronDown className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => duplicate(activeIdx)}>
                  <Copy className="mr-1.5 size-3.5" />
                  Dupliquer
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(activeIdx)} className="text-destructive">
                  <Trash2 className="mr-1.5 size-3.5" />
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto size-12" />
              <p className="mt-2 text-sm">Aucune slide</p>
            </div>
          )}
        </main>

        {/* Edit panel droite */}
        <aside className="flex w-80 flex-col border-l border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Edition</p>
            <p className="mt-0.5 text-sm font-semibold">
              {activeSlide ? getSlideLabel(activeSlide) : '—'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeSlide && <SlideEditor slide={activeSlide} onChange={patchActive} />}
          </div>
        </aside>
      </div>
    </div>
    </BrandColorProvider>
  )
}

/** Thumbnail sortable d'une slide dans la sidebar gauche. */
function SortableThumb({
  slide,
  idx,
  isActive,
  onClick,
}: {
  slide: BrandedSlide
  idx: number
  isActive: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group relative flex w-full cursor-pointer flex-col gap-1 rounded-lg border-2 p-1.5 text-left transition-all ${
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      } ${isDragging ? 'ring-2 ring-primary/40' : ''}`}
    >
      {/* Handle drag : icone qui apparait au hover */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute -left-1 top-1/2 -translate-y-1/2 cursor-grab rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 active:cursor-grabbing"
        title="Glisser pour reordonner"
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="overflow-hidden rounded border border-border bg-white">
        <SlideCanvas scale={THUMB_SCALE}>
          <SlideView slide={slide} />
        </SlideCanvas>
      </div>
      <div className="flex items-center justify-between">
        <span className="truncate text-[10px] font-medium">
          {idx + 1}. {getSlideLabel(slide)}
        </span>
        {slide.customized && (
          <span
            title="Slide modifiee"
            className="size-1.5 shrink-0 rounded-full bg-orange-500"
          />
        )}
      </div>
    </div>
  )
}

function SaveIndicator({
  status,
}: {
  status: { text: string; tone: 'saving' | 'saved' | 'error' | 'idle' }
}) {
  const colors = {
    saving: 'text-blue-600',
    saved: 'text-green-600',
    error: 'text-destructive',
    idle: 'text-muted-foreground',
  }
  const Icon = status.tone === 'saving' ? Loader2 : Save
  return (
    <div className={`flex items-center gap-1.5 text-xs ${colors[status.tone]}`}>
      <Icon className={`size-3 ${status.tone === 'saving' ? 'animate-spin' : ''}`} />
      {status.text}
    </div>
  )
}

function formatRelative(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 5) return 'a l\'instant'
  if (diffSec < 60) return `il y a ${diffSec}s`
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)}min`
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
