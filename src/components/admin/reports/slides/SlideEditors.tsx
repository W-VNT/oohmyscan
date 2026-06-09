/**
 * Panneaux d'edition pour chaque type de slide.
 * Affiches dans le panel droit de l'editeur quand une slide est selectionnee.
 *
 * Chaque editor prend la slide + onChange qui produit une nouvelle slide
 * (immutabilite + customized:true).
 */

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, RefreshCw, Check, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from '@/components/shared/Toast'
import { useCampaignReportData } from '@/hooks/admin/useCampaignReportData'
import { supabase } from '@/lib/supabase'
import type {
  BrandedSlide,
  CoverBrandSlide,
  TocBrandSlide,
  SupportIntroSlide,
  CampaignTimelineSlide,
  RegionMapSlide,
  RegionIntroSlide,
  PhotoFullSlide,
  ThanksSlide,
} from '@/lib/campaign-report-types'
import { buildStaticMapUrl, MAP_STYLES, STYLE_DEFAULT } from '@/lib/mapbox-static'
import { postalCodeToRegion } from '@/lib/regions-fr'

// =========================================================================
// Petits primitives reutilises par les editeurs
// =========================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
    />
  )
}

function PhotoPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (path: string | null) => void
}) {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { data: reportData } = useCampaignReportData(campaignId)
  const candidatePhotos = useMemo(() => {
    if (!reportData) return []
    const out: Array<{ id: string; storage_path: string }> = []
    for (const [, photos] of reportData.photosByPanelId) {
      const best = photos.find((p) => p.photo_type === 'installation') ?? photos[0]
      if (best) out.push(best)
    }
    return out
  }, [reportData])

  return (
    <div>
      {candidatePhotos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune photo disponible.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {candidatePhotos.slice(0, 24).map((p) => {
            const isSelected = p.storage_path === value
            return (
              <button
                key={p.id}
                onClick={() => onChange(p.storage_path)}
                className={`relative aspect-[3/4] overflow-hidden rounded border-2 ${
                  isSelected ? 'border-primary' : 'border-transparent hover:border-border'
                }`}
              >
                <PhotoThumb path={p.storage_path} />
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
      {value && (
        <button
          onClick={() => onChange(null)}
          className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Retirer la photo
        </button>
      )}
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
    return () => { cancelled = true }
  }, [path])
  if (!url) {
    return (
      <div className="flex size-full items-center justify-center bg-muted">
        <ImageIcon className="size-4 text-muted-foreground" />
      </div>
    )
  }
  return <img src={url} alt="" className="size-full object-cover" />
}

// =========================================================================
// Editor par type
// =========================================================================

function CoverEditor({ slide, onChange }: { slide: CoverBrandSlide; onChange: (s: BrandedSlide) => void }) {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { data: reportData } = useCampaignReportData(campaignId)

  const patch = (data: Partial<CoverBrandSlide['data']>) =>
    onChange({ ...slide, customized: true, data: { ...slide.data, ...data } })

  /** Refresh : reprend le nom client + titre par defaut depuis la campagne. */
  function refreshFromCampaign() {
    if (!reportData) return
    patch({
      clientName: reportData.clientName,
      subtitle: reportData.campaignName.toUpperCase(),
    })
    toast('Cover actualisee depuis la campagne')
  }

  return (
    <div className="space-y-4">
      <Field label="Titre">
        <Input value={slide.data.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Sous-titre (badge)">
        <Input value={slide.data.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} />
      </Field>
      <Field label="Nom client">
        <Input value={slide.data.clientName} onChange={(e) => patch({ clientName: e.target.value })} />
      </Field>
      <Field label="Photo de couverture">
        <PhotoPicker
          value={slide.data.coverPhotoPath}
          onChange={(coverPhotoPath) => patch({ coverPhotoPath })}
        />
      </Field>
      <Button variant="outline" size="sm" onClick={refreshFromCampaign} disabled={!reportData}>
        <RefreshCw className="mr-1.5 size-3.5" />
        Actualiser depuis campagne
      </Button>
    </div>
  )
}

function TocEditor({ slide, onChange }: { slide: TocBrandSlide; onChange: (s: BrandedSlide) => void }) {
  /** Renumerote auto : 01, 02, 03... apres chaque mutation. */
  function renumber(items: TocBrandSlide['data']['items']) {
    return items.map((it, i) => ({ ...it, number: String(i + 1).padStart(2, '0') }))
  }

  const patchItem = (idx: number, item: Partial<TocBrandSlide['data']['items'][number]>) => {
    const items = slide.data.items.map((it, i) => (i === idx ? { ...it, ...item } : it))
    onChange({ ...slide, customized: true, data: { items: renumber(items) } })
  }

  const addItem = () => {
    const items = [
      ...slide.data.items,
      { number: '', title: 'Nouvelle section', subtitle: '' },
    ]
    onChange({ ...slide, customized: true, data: { items: renumber(items) } })
  }

  const removeItem = (idx: number) => {
    if (slide.data.items.length <= 1) {
      toast('Au moins un item est requis', 'error')
      return
    }
    const items = slide.data.items.filter((_, i) => i !== idx)
    onChange({ ...slide, customized: true, data: { items: renumber(items) } })
  }

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= slide.data.items.length) return
    const items = [...slide.data.items]
    ;[items[idx], items[target]] = [items[target], items[idx]]
    onChange({ ...slide, customized: true, data: { items: renumber(items) } })
  }

  return (
    <div className="space-y-3">
      {slide.data.items.map((item, idx) => (
        <div key={idx} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Item {item.number}</p>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => moveItem(idx, -1)}
                disabled={idx === 0}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                title="Monter"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                onClick={() => moveItem(idx, 1)}
                disabled={idx === slide.data.items.length - 1}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                title="Descendre"
              >
                <ChevronDown className="size-3.5" />
              </button>
              <button
                onClick={() => removeItem(idx)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          <Input
            value={item.title}
            onChange={(e) => patchItem(idx, { title: e.target.value })}
            placeholder="Titre"
          />
          <Input
            value={item.subtitle}
            onChange={(e) => patchItem(idx, { subtitle: e.target.value })}
            placeholder="Sous-titre"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="mr-1.5 size-3.5" />
        Ajouter un item
      </Button>
    </div>
  )
}

function SupportIntroEditor({
  slide,
  onChange,
}: {
  slide: SupportIntroSlide
  onChange: (s: BrandedSlide) => void
}) {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { data: reportData } = useCampaignReportData(campaignId)

  const patch = (data: Partial<SupportIntroSlide['data']>) =>
    onChange({ ...slide, customized: true, data: { ...slide.data, ...data } })

  const hasDefault = !!reportData?.defaultIntroText
  const canRestore = hasDefault && slide.data.introText !== reportData?.defaultIntroText

  function restoreDefault() {
    if (!reportData) return
    patch({ introText: reportData.defaultIntroText })
    toast('Texte par defaut restaure')
  }

  return (
    <div className="space-y-4">
      <Field label="Label badge (rouge)">
        <Input value={slide.data.sectionLabel} onChange={(e) => patch({ sectionLabel: e.target.value })} />
      </Field>
      <Field label="Texte d'introduction">
        <TextArea
          value={slide.data.introText}
          onChange={(introText) => patch({ introText })}
          rows={8}
          placeholder="Notre reseau est constitue de..."
        />
        {canRestore && (
          <button
            onClick={restoreDefault}
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground underline hover:text-foreground"
          >
            <RefreshCw className="size-3" />
            Restaurer texte par defaut
          </button>
        )}
      </Field>
      <Field label="Visuel droite (affiche)">
        <PhotoPicker value={slide.data.visualPath} onChange={(visualPath) => patch({ visualPath })} />
      </Field>
    </div>
  )
}

function CampaignTimelineEditor({
  slide,
  onChange,
}: {
  slide: CampaignTimelineSlide
  onChange: (s: BrandedSlide) => void
}) {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { data: reportData } = useCampaignReportData(campaignId)

  const patchData = (patch: Partial<CampaignTimelineSlide['data']>) =>
    onChange({ ...slide, customized: true, data: { ...slide.data, ...patch } })

  const patchItem = (idx: number, p: Partial<CampaignTimelineSlide['data']['items'][number]>) => {
    const items = slide.data.items.map((it, i) => (i === idx ? { ...it, ...p } : it))
    patchData({ items })
  }

  /** Re-calcule les 4 jalons auto depuis les donnees campagne, garde le 5e (bonus). */
  function refreshFromCampaign() {
    if (!reportData) return
    const start = reportData.startDate ? new Date(reportData.startDate) : null
    const launchLabel = start
      ? `Semaine ${Math.ceil(((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / 86_400_000 + start.getDay() + 1) / 7)}`
      : '—'
    const regions = Array.from(reportData.panelsByRegion.keys()).filter((r) => r !== 'Inconnu')
    const zoneLabel = regions.length > 0 ? regions.join(', ') : '—'

    // Garde les labels existants (l'admin a peut-etre customise "Date de lancement")
    // mais reset les valeurs
    const existing = slide.data.items
    const refreshed = [
      { label: existing[0]?.label ?? 'Date de lancement', value: launchLabel },
      { label: existing[1]?.label ?? "Nombre d'affiches", value: String(reportData.totalPanels) },
      { label: existing[2]?.label ?? 'Zone geographique', value: zoneLabel },
      { label: existing[3]?.label ?? 'Nombre de lieux', value: String(reportData.totalLocations) },
      existing[4] ?? { label: '', value: 'Une communication ultra ciblee !' },
      ...existing.slice(5),
    ]
    patchData({ items: refreshed })
    toast('Timeline actualisee')
  }

  return (
    <div className="space-y-3">
      <Field label="Label badge (rouge)">
        <Input
          value={slide.data.sectionLabel ?? 'LA CAMPAGNE'}
          onChange={(e) => patchData({ sectionLabel: e.target.value })}
        />
      </Field>

      {slide.data.items.map((item, idx) => (
        <div key={idx} className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Jalon {idx + 1}</p>
          <Input
            value={item.label}
            onChange={(e) => patchItem(idx, { label: e.target.value })}
            placeholder="Label (ex: Date de lancement)"
          />
          <Input
            value={item.value}
            onChange={(e) => patchItem(idx, { value: e.target.value })}
            placeholder="Valeur (ex: Semaine 33)"
          />
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={refreshFromCampaign} disabled={!reportData} className="w-full">
        <RefreshCw className="mr-1.5 size-3.5" />
        Actualiser valeurs depuis campagne
      </Button>
    </div>
  )
}

function RegionMapEditor({
  slide,
  onChange,
}: {
  slide: RegionMapSlide
  onChange: (s: BrandedSlide) => void
}) {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { data: reportData } = useCampaignReportData(campaignId)
  const currentStyle = slide.data.mapStyle ?? STYLE_DEFAULT

  function buildUrlForStyle(style: string): string | null {
    if (!reportData) return slide.data.mapImageUrl
    const panels = reportData.panelsByRegion.get(slide.data.region) ?? []
    const points = panels.map((p) => ({ lat: p.lat, lng: p.lng }))
    return buildStaticMapUrl(points, { width: 800, height: 700, pinSize: 's', style })
  }

  function changeStyle(newStyle: string) {
    const mapImageUrl = buildUrlForStyle(newStyle)
    onChange({
      ...slide,
      customized: true,
      data: { ...slide.data, mapStyle: newStyle, mapImageUrl },
    })
  }

  function refreshMap() {
    const mapImageUrl = buildUrlForStyle(currentStyle)
    onChange({ ...slide, customized: true, data: { ...slide.data, mapImageUrl } })
  }

  const patchData = (patch: Partial<RegionMapSlide['data']>) =>
    onChange({ ...slide, customized: true, data: { ...slide.data, ...patch } })

  return (
    <div className="space-y-4">
      <Field label="Nom region affiche">
        <Input
          value={slide.data.regionLabel ?? slide.data.region}
          onChange={(e) => patchData({ regionLabel: e.target.value })}
        />
      </Field>

      <Field label="Label badge (rouge)">
        <Input
          value={slide.data.sectionLabel ?? 'ZONE DE DIFFUSION'}
          onChange={(e) => patchData({ sectionLabel: e.target.value })}
        />
      </Field>

      <Field label="Titre encadre droit">
        <Input
          value={slide.data.zoomTitle ?? 'Zoom sur la zone de diffusion'}
          onChange={(e) => patchData({ zoomTitle: e.target.value })}
        />
      </Field>

      <Field label="Style de carte">
        <div className="space-y-1.5">
          {MAP_STYLES.map((opt) => {
            const isSelected = opt.value === currentStyle
            return (
              <button
                key={opt.value}
                onClick={() => changeStyle(opt.value)}
                className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div
                  className={`mt-0.5 size-3.5 shrink-0 rounded-full border-2 ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight">{opt.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Description encadre">
        <TextArea
          value={slide.data.description}
          onChange={(description) => patchData({ description })}
          rows={3}
        />
      </Field>

      <Button variant="outline" size="sm" onClick={refreshMap}>
        <RefreshCw className="mr-1.5 size-3.5" />
        Actualiser depuis donnees campagne
      </Button>
    </div>
  )
}

function RegionIntroEditor({
  slide,
  onChange,
}: {
  slide: RegionIntroSlide
  onChange: (s: BrandedSlide) => void
}) {
  const patchData = (patch: Partial<RegionIntroSlide['data']>) =>
    onChange({ ...slide, customized: true, data: { ...slide.data, ...patch } })

  return (
    <div className="space-y-4">
      <Field label="Nom region affiche">
        <Input
          value={slide.data.regionLabel ?? slide.data.region}
          onChange={(e) => patchData({ regionLabel: e.target.value })}
        />
      </Field>

      <Field label="Label badge (rouge)">
        <Input
          value={slide.data.sectionLabel ?? 'LES PHOTOS'}
          onChange={(e) => patchData({ sectionLabel: e.target.value })}
        />
      </Field>

      <Field label="Sous-titre bas">
        <Input
          value={slide.data.footerNote ?? 'Un aperçu de votre campagne publicitaire'}
          onChange={(e) => patchData({ footerNote: e.target.value })}
        />
      </Field>
      <Field label="Photo de fond (sera passee en N&B)">
        <PhotoPicker
          value={slide.data.backgroundPhotoPath}
          onChange={(backgroundPhotoPath) => patchData({ backgroundPhotoPath })}
        />
      </Field>
    </div>
  )
}

function PhotoFullEditor({
  slide,
  onChange,
}: {
  slide: PhotoFullSlide
  onChange: (s: BrandedSlide) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Photo">
        <PhotoPicker
          value={slide.data.photoPath}
          onChange={(photoPath) => {
            if (!photoPath) return
            onChange({ ...slide, customized: true, data: { ...slide.data, photoPath } })
          }}
        />
      </Field>
      <Field label="Legende (optionnel)">
        <Input
          value={slide.data.caption ?? ''}
          onChange={(e) =>
            onChange({
              ...slide,
              customized: true,
              data: { ...slide.data, caption: e.target.value || null },
            })
          }
          placeholder="Ex: Camping Les Pins, Carcans"
        />
      </Field>
      {slide.data.region && (
        <p className="text-xs text-muted-foreground">
          Region detectee : <strong>{slide.data.region}</strong>
        </p>
      )}
    </div>
  )
}

function ThanksEditor({
  slide,
  onChange,
}: {
  slide: ThanksSlide
  onChange: (s: BrandedSlide) => void
}) {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { data: reportData } = useCampaignReportData(campaignId)

  const patch = (data: Partial<ThanksSlide['data']>) =>
    onChange({ ...slide, customized: true, data: { ...slide.data, ...data } })

  function refreshContact() {
    if (!reportData?.defaultContact) {
      toast('Aucun contact commercial defini sur la campagne', 'error')
      return
    }
    patch({
      contactName: reportData.defaultContact.name,
      contactEmail: reportData.defaultContact.email,
      contactPhone: reportData.defaultContact.phone,
    })
    toast('Contact actualise depuis campagne')
  }

  function refreshSocialLinks() {
    if (!reportData) return
    patch({
      linkedinUrl: reportData.defaultLinkedinUrl,
      websiteUrl: reportData.defaultWebsiteUrl,
    })
    toast('Reseaux actualises depuis settings')
  }

  return (
    <div className="space-y-4">
      <Field label="Titre">
        <Input value={slide.data.headline} onChange={(e) => patch({ headline: e.target.value })} />
      </Field>
      <Field label="Sous-texte">
        <TextArea value={slide.data.subtext} onChange={(subtext) => patch({ subtext })} rows={2} />
      </Field>
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contact campagne
          </p>
          <button
            onClick={refreshContact}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline hover:text-foreground"
            title="Reprendre le contact commercial du client"
          >
            <RefreshCw className="size-3" />
            Actualiser
          </button>
        </div>
        <div className="space-y-3">
          <Input
            value={slide.data.contactName}
            onChange={(e) => patch({ contactName: e.target.value })}
            placeholder="Nom complet"
          />
          <Input
            value={slide.data.contactEmail}
            onChange={(e) => patch({ contactEmail: e.target.value })}
            placeholder="Email"
            type="email"
          />
          <Input
            value={slide.data.contactPhone}
            onChange={(e) => patch({ contactPhone: e.target.value })}
            placeholder="Telephone"
            type="tel"
          />
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Reseaux
          </p>
          {(reportData?.defaultLinkedinUrl || reportData?.defaultWebsiteUrl) && (
            <button
              onClick={refreshSocialLinks}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline hover:text-foreground"
              title="Reprendre les URLs definies en parametres"
            >
              <RefreshCw className="size-3" />
              Actualiser
            </button>
          )}
        </div>
        <div className="space-y-2">
          <Input
            value={slide.data.linkedinUrl ?? ''}
            onChange={(e) => patch({ linkedinUrl: e.target.value || null })}
            placeholder="LinkedIn URL"
          />
          <Input
            value={slide.data.websiteUrl ?? ''}
            onChange={(e) => patch({ websiteUrl: e.target.value || null })}
            placeholder="Site web URL"
          />
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// Dispatcher
// =========================================================================
// Suppress unused param warning for postalCodeToRegion (peut etre utilise plus tard)
void postalCodeToRegion

export function SlideEditor({
  slide,
  onChange,
}: {
  slide: BrandedSlide
  onChange: (slide: BrandedSlide) => void
}) {
  switch (slide.type) {
    case 'cover_brand': return <CoverEditor slide={slide} onChange={onChange} />
    case 'toc_brand': return <TocEditor slide={slide} onChange={onChange} />
    case 'support_intro': return <SupportIntroEditor slide={slide} onChange={onChange} />
    case 'campaign_timeline': return <CampaignTimelineEditor slide={slide} onChange={onChange} />
    case 'region_map': return <RegionMapEditor slide={slide} onChange={onChange} />
    case 'region_intro': return <RegionIntroEditor slide={slide} onChange={onChange} />
    case 'photo_full': return <PhotoFullEditor slide={slide} onChange={onChange} />
    case 'thanks': return <ThanksEditor slide={slide} onChange={onChange} />
  }
}
