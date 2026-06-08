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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import {
  useCampaignReport,
  useAutosaveCampaignReport,
  useDeleteCampaignReport,
  useCreateOrReplaceCampaignReport,
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

  const [slides, setSlides] = useState<BrandedSlide[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [introText, setIntroText] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState<string>(BRAND_RED)
  const [exporting, setExporting] = useState(false)
  const [previewScale, setPreviewScale] = useState(PREVIEW_SCALE_BASE)

  // Charge les slides depuis le rapport en DB
  useEffect(() => {
    if (report) {
      setSlides((report.slides as BrandedSlide[]) ?? [])
      setIntroText(report.intro_text)
      setBrandColor(report.brand_color || BRAND_RED)
    }
  }, [report])

  // Resize : ajuste le scale de la preview pour rentrer dans la zone visible
  const previewContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function adjustScale() {
      const el = previewContainerRef.current
      if (!el) return
      const targetW = el.clientWidth - 64
      const targetH = el.clientHeight - 64
      const scaleW = targetW / 1414
      const scaleH = targetH / 1000
      setPreviewScale(Math.max(0.2, Math.min(0.9, Math.min(scaleW, scaleH))))
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
    const ok = window.confirm(
      'Regenerer le rapport depuis le modele va ecraser toutes les modifications manuelles. Continuer ?',
    )
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
    const ok = window.confirm('Supprimer definitivement ce rapport ?')
    if (!ok) return
    try {
      await deleteReport.mutateAsync({ id: report.id, campaign_id: report.campaign_id })
      toast('Rapport supprime')
      navigate(`/admin/campaigns/${campaignId}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur', 'error')
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
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/campaigns/${campaignId}`}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Retour campagne"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-sm font-semibold leading-tight">{campaign?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Rapport campagne</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <BrandColorPicker value={brandColor} onChange={setBrandColor} />
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <Sparkles className="mr-1.5 size-3.5" />
            Regenerer
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
            <Trash2 className="mr-1.5 size-3.5" />
            Supprimer
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Download className="mr-1.5 size-3.5" />}
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Body : sidebar thumbnails | preview | edit panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar thumbnails */}
        <aside className="flex w-56 flex-col border-r border-border bg-background">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Slides ({slides.length})
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveIdx(idx)}
                className={`group flex w-full flex-col gap-1 rounded-lg border-2 p-1.5 text-left transition-all ${
                  idx === activeIdx
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border hover:bg-muted/50'
                }`}
              >
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
              </button>
            ))}
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
