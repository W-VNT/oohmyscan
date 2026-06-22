/**
 * Types du nouveau rapport campagne template-driven.
 *
 * Chaque slide est typee : une slide = un type precis = un layout charte fige.
 * Plus simple a generer auto, plus simple a editer (on edite des props, pas une structure).
 *
 * Pour l'editeur libre legacy, voir src/pages/admin/reports/ProofOfPostingPage.tsx.
 */

import type { RegionFR } from './regions-fr'

export type BrandedSlideType =
  | 'cover_brand'
  | 'toc_brand'
  | 'support_intro'
  | 'campaign_timeline'
  | 'region_map'
  | 'region_intro'
  | 'photo_full'
  | 'thanks'

/** Slide de couverture (page 1 du modele Orange). */
export interface CoverBrandSlide {
  id: string
  type: 'cover_brand'
  customized: boolean
  data: {
    title: string         // "Reporting"
    subtitle: string      // "PROMOPIETON ESTIVAL" (souvent = product/campagne)
    clientName: string    // "Orange"
    coverPhotoPath: string | null // storage path d'une photo terrain
  }
}

/** Sommaire 4 cases numerotees (page 2). */
export interface TocBrandSlide {
  id: string
  type: 'toc_brand'
  customized: boolean
  data: {
    items: Array<{
      number: string      // "01", "02"...
      title: string       // "Le support publicitaire"
      subtitle: string    // "Le reseau PromoPieton Estival"
    }>
  }
}

/** Page "Le support publicitaire" : badge + texte + visuel (page 3). */
export interface SupportIntroSlide {
  id: string
  type: 'support_intro'
  customized: boolean
  data: {
    sectionLabel: string  // Badge rouge : "PROMOPIETON ESTIVAL"
    introText: string     // Le paragraphe descriptif (default from settings, overridable)
    visualPath: string | null // L'affiche / visuel campagne
  }
}

/** Timeline campagne avec 5 jalons (page 4). */
export interface CampaignTimelineSlide {
  id: string
  type: 'campaign_timeline'
  customized: boolean
  data: {
    sectionLabel?: string  // Badge rouge en haut (defaut: "LA CAMPAGNE")
    items: Array<{ label: string; value: string }>
    // 5 items par defaut : Date lancement / Nb affiches / Zone geo / Nb lieux / Bonus
  }
}

/** Carte d'une region avec pins panneaux (pages 5-7 = 1 par region). */
export interface RegionMapSlide {
  id: string
  type: 'region_map'
  customized: boolean
  data: {
    region: RegionFR          // Cle technique de region (utilisee pour le filtrage panels)
    regionLabel?: string      // Texte affiche (defaut: meme valeur que region)
    sectionLabel?: string     // Badge rouge en haut (defaut: "ZONE DE DIFFUSION")
    zoomTitle?: string        // Titre encadre droit (defaut: "Zoom sur la zone de diffusion")
    mapImageUrl: string | null  // URL Mapbox Static API generee
    mapStyle: string | null     // Style Mapbox (ex: 'mapbox/light-v11'). null = utilise le defaut.
    description: string         // "Notre equipe de diffusion vous offre un ciblage..."
  }
}

/** Intro photos region : photo BW + nom region (pages 8, 11, 18...). */
export interface RegionIntroSlide {
  id: string
  type: 'region_intro'
  customized: boolean
  data: {
    region: RegionFR
    regionLabel?: string                // Defaut: meme valeur que region
    sectionLabel?: string               // Badge rouge (defaut: "LES PHOTOS")
    footerNote?: string                 // Sous-titre bas droit (defaut: "Un aperçu de votre campagne publicitaire")
    backgroundPhotoPath: string | null  // Photo en background (BW + tint)
  }
}

/** Photo pleine page (pages 9, 10, 12-17, 19-33...). */
export interface PhotoFullSlide {
  id: string
  type: 'photo_full'
  customized: boolean
  data: {
    photoPath: string
    region: RegionFR | null  // utile pour reordonnancer
    caption: string | null   // optionnel
  }
}

/** Page Merci (derniere page). */
export interface ThanksSlide {
  id: string
  type: 'thanks'
  customized: boolean
  data: {
    headline: string        // "Merci pour votre confiance"
    subtext: string         // "N'hesitez pas a nous contacter..."
    contactName: string
    contactEmail: string
    contactPhone: string
    linkedinUrl: string | null
    websiteUrl: string | null
  }
}

export type BrandedSlide =
  | CoverBrandSlide
  | TocBrandSlide
  | SupportIntroSlide
  | CampaignTimelineSlide
  | RegionMapSlide
  | RegionIntroSlide
  | PhotoFullSlide
  | ThanksSlide

/** Donnees agregees calculees a partir de la campagne pour pre-remplir les slides. */
export interface CampaignReportData {
  campaignId: string
  campaignName: string
  clientName: string
  startDate: string | null
  endDate: string | null
  totalPanels: number
  totalPhotos: number
  totalLocations: number
  // Panneaux groupes par region (deja calcule)
  panelsByRegion: Map<RegionFR, PanelLite[]>
  // Photos groupees par panel_id pour lookup rapide
  photosByPanelId: Map<string, PhotoLite[]>
  // Stats reseau globales (a date)
  networkStats: {
    totalLocationsAll: number  // tous les lieux OOH MY AD !
    totalPanelsAll: number     // tous les panneaux OOH MY AD !
  }
  // Contact commercial campagne (depuis clients.commercial_id, sinon admin actuel)
  defaultContact: {
    name: string
    email: string
    phone: string
  } | null
  // Defaults depuis company_settings
  defaultIntroText: string
  defaultLinkedinUrl: string | null
  defaultWebsiteUrl: string | null
  defaultBrandColor: string | null
}

export interface PanelLite {
  id: string
  reference: string
  name: string | null
  city: string | null
  address: string | null
  postal_code: string | null  // resolu via location.postal_code ou extrait de address
  lat: number
  lng: number
}

export interface PhotoLite {
  id: string
  panel_id: string
  storage_path: string
  photo_type: string
  taken_at: string
}

/** Row de la table campaign_reports. */
export interface CampaignReport {
  id: string
  campaign_id: string
  slides: BrandedSlide[]
  intro_text: string | null
  cover_photo_path: string | null
  contact_user_id: string | null
  contact_name_override: string | null
  contact_email_override: string | null
  contact_phone_override: string | null
  brand_color: string | null
  template_version: number
  generated_at: string
  updated_at: string
  /** Token UUID stable utilisé dans les URLs publiques. */
  public_token: string
  /** Chemin du PDF dans campaign-reports-public (null = non publié). */
  published_pdf_path: string | null
  /** Timestamp de la dernière publication. */
  published_at: string | null
}
