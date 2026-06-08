import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, X, Image as ImageIcon, FileText, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/Toast'
import { supabase } from '@/lib/supabase'
import { useCampaignReportData } from '@/hooks/admin/useCampaignReportData'
import {
  useCampaignReport,
  useCreateOrReplaceCampaignReport,
} from '@/hooks/admin/useCampaignReport'
import { generateReportFromTemplate } from '@/lib/campaign-report-generator'
import type { PhotoLite } from '@/lib/campaign-report-types'

interface Props {
  campaignId: string
  isOpen: boolean
  onClose: () => void
}

/**
 * Modale de generation/regeneration d'un rapport campagne.
 *
 * Etapes :
 *  1. Affiche les stats agregees (panneaux, photos, regions)
 *  2. Permet de choisir la photo de cover dans la galerie
 *  3. Permet d'editer le texte d'intro (pre-rempli depuis settings)
 *  4. "Generer" -> create or replace le rapport en DB
 *  5. Toast succes + redirige vers /admin/campaigns/:id/report (Phase 3 = editeur)
 */
export function GenerateReportModal({ campaignId, isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const { data: reportData, isLoading: dataLoading } = useCampaignReportData(campaignId)
  const { data: existingReport } = useCampaignReport(campaignId)
  const createReport = useCreateOrReplaceCampaignReport()

  const [coverPhotoPath, setCoverPhotoPath] = useState<string | null>(null)
  const [introText, setIntroText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Liste a plat de toutes les photos disponibles (1 par panneau, prio installation)
  const candidatePhotos: PhotoLite[] = useMemo(() => {
    if (!reportData) return []
    const result: PhotoLite[] = []
    for (const [, photos] of reportData.photosByPanelId) {
      const best = photos.find((p) => p.photo_type === 'installation') ?? photos[0]
      if (best) result.push(best)
    }
    return result
  }, [reportData])

  // Pre-remplit l'intro avec la valeur existante (override OU defaut settings)
  useEffect(() => {
    if (!isOpen || !reportData) return
    setIntroText(existingReport?.intro_text ?? reportData.defaultIntroText ?? '')
    setCoverPhotoPath(existingReport?.cover_photo_path ?? candidatePhotos[0]?.storage_path ?? null)
  }, [isOpen, reportData, existingReport, candidatePhotos])

  if (!isOpen) return null

  async function handleGenerate() {
    if (!reportData) return
    setSubmitting(true)
    try {
      const slides = generateReportFromTemplate(reportData, {
        coverPhotoPath,
        introTextOverride: introText,
      })
      await createReport.mutateAsync({
        campaign_id: campaignId,
        slides,
        intro_text: introText,
        cover_photo_path: coverPhotoPath,
      })
      toast(`Rapport genere : ${slides.length} slides`)
      onClose()
      navigate(`/admin/campaigns/${campaignId}/report`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erreur lors de la generation', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5" />
            <h2 className="text-base font-semibold">
              {existingReport ? 'Regenerer le rapport' : 'Generer un rapport'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {dataLoading || !reportData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {existingReport && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                  <strong>Attention :</strong> un rapport existe deja pour cette campagne.
                  Le regenerer remplacera ses slides (les modifications manuelles seront perdues).
                </div>
              )}

              {/* Stats */}
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Aper&ccedil;u
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Panneaux" value={reportData.totalPanels} />
                  <StatCard label="Photos" value={reportData.totalPhotos} />
                  <StatCard label="Regions" value={reportData.panelsByRegion.size} />
                </div>
              </div>

              {/* Cover photo picker */}
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Photo de couverture
                </h3>
                {candidatePhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune photo disponible pour cette campagne.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {candidatePhotos.slice(0, 12).map((photo) => {
                      const isSelected = photo.storage_path === coverPhotoPath
                      return (
                        <button
                          key={photo.id}
                          onClick={() => setCoverPhotoPath(photo.storage_path)}
                          className={`relative aspect-[3/4] overflow-hidden rounded-md border-2 transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-border'
                          }`}
                        >
                          <PhotoThumb path={photo.storage_path} />
                          {isSelected && (
                            <div className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-3" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Intro text */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Texte d'introduction du support
                  </h3>
                  {reportData.defaultIntroText &&
                    introText !== reportData.defaultIntroText && (
                      <button
                        onClick={() => setIntroText(reportData.defaultIntroText)}
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        Restaurer texte par defaut
                      </button>
                    )}
                </div>
                <textarea
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                  rows={5}
                  placeholder="Notre reseau est constitue de ..."
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Pre-rempli depuis Param&egrave;tres &gt; Documents. Modifiable pour cette campagne uniquement.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={submitting || dataLoading || !reportData}
          >
            {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {existingReport ? 'Regenerer' : 'Generer le rapport'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    supabase.storage
      .from('panel-photos')
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl)
      })
    return () => {
      cancelled = true
    }
  }, [path])
  if (!url) {
    return <div className="flex size-full items-center justify-center bg-muted">
      <ImageIcon className="size-4 text-muted-foreground" />
    </div>
  }
  return <img src={url} alt="" className="size-full object-cover" />
}

