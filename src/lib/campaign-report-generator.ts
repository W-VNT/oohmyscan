/**
 * Generateur de template de rapport campagne.
 *
 * Prend les donnees agregees (CampaignReportData) et produit l'array
 * BrandedSlide[] pre-rempli pret a etre charge dans l'editeur.
 *
 * Aucun appel reseau ici, juste de la transformation de donnees.
 */

import { buildStaticMapUrl, STYLE_DEFAULT } from './mapbox-static'
import type {
  BrandedSlide,
  CampaignReportData,
  CoverBrandSlide,
  TocBrandSlide,
  SupportIntroSlide,
  CampaignTimelineSlide,
  RegionMapSlide,
  RegionIntroSlide,
  PhotoFullSlide,
  ThanksSlide,
  PanelLite,
  PhotoLite,
} from './campaign-report-types'
import type { RegionFR } from './regions-fr'

/** Max photos par region dans le template par defaut. L'admin en ajoute via l'editeur. */
const DEFAULT_MAX_PHOTOS_PER_REGION = 10

/** Sections statiques du sommaire (Orange-style). */
const TOC_SECTIONS = [
  { number: '01', title: 'Le support publicitaire', subtitle: 'Le reseau et son fonctionnement' },
  { number: '02', title: 'Deroule de la campagne', subtitle: 'Les caracteristiques de la campagne' },
  { number: '03', title: 'La zone de diffusion', subtitle: 'Un mapping precis et sur-mesure' },
  { number: '04', title: 'Les photos', subtitle: 'Le meilleur pour la fin !' },
]

const DEFAULT_REGION_DESCRIPTION =
  'Notre equipe de diffusion vous offre un ciblage precis et sur-mesure.'

const DEFAULT_THANKS_HEADLINE = 'Merci pour votre confiance'
const DEFAULT_THANKS_SUBTEXT =
  "N'hesitez pas a nous contacter pour vos futurs projets en publicite !"

export interface GenerateReportOptions {
  /** Photo de cover choisie par l'admin (storage path). Sinon : 1ere photo dispo. */
  coverPhotoPath?: string | null
  /** Texte d'intro custom. Sinon : data.defaultIntroText. */
  introTextOverride?: string | null
  /** Max photos par region (defaut 10). */
  maxPhotosPerRegion?: number
}

/**
 * Genere le tableau complet de slides pre-remplies a partir des donnees campagne.
 */
export function generateReportFromTemplate(
  data: CampaignReportData,
  options: GenerateReportOptions = {},
): BrandedSlide[] {
  const {
    coverPhotoPath = null,
    introTextOverride = null,
    maxPhotosPerRegion = DEFAULT_MAX_PHOTOS_PER_REGION,
  } = options

  // Toutes les photos a plat (utile pour fallback cover)
  const allPhotos = Array.from(data.photosByPanelId.values()).flat()

  // Cover photo : prio option > 1ere photo terrain
  const resolvedCoverPath = coverPhotoPath ?? allPhotos[0]?.storage_path ?? null

  // Texte d'intro : prio override > default settings > fallback statique
  const introText =
    introTextOverride ??
    data.defaultIntroText ??
    `Notre reseau est constitue de ${data.networkStats.totalLocationsAll} lieux sur lesquels sont repartis ${data.networkStats.totalPanelsAll} panneaux d'affichage publicitaire.`

  // Regions presentes (qui ont au moins 1 panneau)
  const regionsPresent = Array.from(data.panelsByRegion.keys())
    .filter((r) => r !== 'Inconnu')
    .sort((a, b) => a.localeCompare(b, 'fr'))

  const slides: BrandedSlide[] = []

  // 1. COVER
  slides.push(makeCover(data, resolvedCoverPath))

  // 2. SOMMAIRE
  slides.push(makeToc())

  // 3. SUPPORT INTRO
  slides.push(makeSupportIntro(data, introText, resolvedCoverPath))

  // 4. CAMPAGNE TIMELINE
  slides.push(makeTimeline(data, regionsPresent))

  // 5. ZONES DE DIFFUSION (1 par region)
  for (const region of regionsPresent) {
    const regionPanels = data.panelsByRegion.get(region) ?? []
    slides.push(makeRegionMap(region, regionPanels))
  }

  // 6. PHOTOS PAR REGION (intro + photos full)
  for (const region of regionsPresent) {
    const regionPanels = data.panelsByRegion.get(region) ?? []
    const regionPhotos = pickPhotosForRegion(regionPanels, data.photosByPanelId, maxPhotosPerRegion)
    if (regionPhotos.length === 0) continue

    // intro region : utilise la 1ere photo de la region en background
    slides.push(makeRegionIntro(region, regionPhotos[0].storage_path))

    // photos full page
    for (const photo of regionPhotos) {
      slides.push(makePhotoFull(photo.storage_path, region))
    }
  }

  // 7. PAGE MERCI
  slides.push(makeThanks(data))

  return slides
}

// =========================================================================
// Slide builders (atomes)
// =========================================================================

function makeCover(data: CampaignReportData, coverPath: string | null): CoverBrandSlide {
  return {
    id: 'slide-cover',
    type: 'cover_brand',
    customized: false,
    data: {
      title: 'Reporting',
      subtitle: data.campaignName.toUpperCase(),
      clientName: data.clientName,
      coverPhotoPath: coverPath,
    },
  }
}

function makeToc(): TocBrandSlide {
  return {
    id: 'slide-toc',
    type: 'toc_brand',
    customized: false,
    data: { items: TOC_SECTIONS },
  }
}

function makeSupportIntro(
  data: CampaignReportData,
  introText: string,
  visualPath: string | null,
): SupportIntroSlide {
  return {
    id: 'slide-support-intro',
    type: 'support_intro',
    customized: false,
    data: {
      sectionLabel: data.campaignName.toUpperCase(),
      introText,
      visualPath,
    },
  }
}

function makeTimeline(data: CampaignReportData, regions: RegionFR[]): CampaignTimelineSlide {
  const startDate = data.startDate ? new Date(data.startDate) : null
  // Numero de semaine ISO 8601
  const launchLabel = startDate ? `Semaine ${getISOWeek(startDate)}` : '—'
  // Zone geo formatee : "PACA, Occitanie, Bretagne"
  const zoneLabel = regions.length > 0 ? regions.map(simplifyRegionLabel).join(', ') : '—'

  return {
    id: 'slide-timeline',
    type: 'campaign_timeline',
    customized: false,
    data: {
      items: [
        { label: 'Date de lancement', value: launchLabel },
        { label: "Nombre d'affiches", value: String(data.totalPanels) },
        { label: 'Zone geographique', value: zoneLabel },
        { label: 'Nombre de lieux', value: String(data.totalLocations) },
        { label: '', value: 'Une communication ultra ciblee !' },
      ],
    },
  }
}

function makeRegionMap(region: RegionFR, panels: PanelLite[]): RegionMapSlide {
  const points = panels.map((p) => ({ lat: p.lat, lng: p.lng }))
  const mapImageUrl = buildStaticMapUrl(points, {
    width: 800,
    height: 700,
    pinSize: 's',
    style: STYLE_DEFAULT,
  })
  return {
    id: `slide-region-map-${region}`,
    type: 'region_map',
    customized: false,
    data: {
      region,
      mapImageUrl,
      mapStyle: STYLE_DEFAULT,
      description: DEFAULT_REGION_DESCRIPTION,
    },
  }
}

function makeRegionIntro(region: RegionFR, photoPath: string | null): RegionIntroSlide {
  return {
    id: `slide-region-intro-${region}`,
    type: 'region_intro',
    customized: false,
    data: { region, backgroundPhotoPath: photoPath },
  }
}

function makePhotoFull(photoPath: string, region: RegionFR): PhotoFullSlide {
  return {
    id: `slide-photo-${crypto.randomUUID()}`,
    type: 'photo_full',
    customized: false,
    data: { photoPath, region, caption: null },
  }
}

function makeThanks(data: CampaignReportData): ThanksSlide {
  const c = data.defaultContact
  return {
    id: 'slide-thanks',
    type: 'thanks',
    customized: false,
    data: {
      headline: DEFAULT_THANKS_HEADLINE,
      subtext: DEFAULT_THANKS_SUBTEXT,
      contactName: c?.name ?? '',
      contactEmail: c?.email ?? '',
      contactPhone: c?.phone ?? '',
      linkedinUrl: data.defaultLinkedinUrl,
      websiteUrl: data.defaultWebsiteUrl,
    },
  }
}

// =========================================================================
// Helpers
// =========================================================================

/** Selectionne les meilleures photos d'une region : prio 'installation', max N. */
function pickPhotosForRegion(
  panels: PanelLite[],
  photosByPanelId: Map<string, PhotoLite[]>,
  max: number,
): PhotoLite[] {
  const result: PhotoLite[] = []
  for (const panel of panels) {
    const panelPhotos = photosByPanelId.get(panel.id) ?? []
    if (panelPhotos.length === 0) continue
    // Prio : installation > derniere
    const best =
      panelPhotos.find((p) => p.photo_type === 'installation') ?? panelPhotos[0]
    result.push(best)
    if (result.length >= max) break
  }
  return result
}

/** Numero de semaine ISO 8601 (1-53). */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** Raccourcit les noms longs ("Provence-Alpes-Cote d'Azur" -> "PACA"). */
function simplifyRegionLabel(region: RegionFR): string {
  const map: Partial<Record<RegionFR, string>> = {
    "Provence-Alpes-Côte d'Azur": 'PACA',
    'Auvergne-Rhône-Alpes': 'Auvergne-Rhone-Alpes',
    'Bourgogne-Franche-Comté': 'Bourgogne-Franche-Comte',
    'Centre-Val de Loire': 'Centre',
  }
  return map[region] ?? region
}
