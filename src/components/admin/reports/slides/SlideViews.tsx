/**
 * Rendu HTML des 8 types de slides du rapport campagne.
 * Utilise dans l'editeur (thumbnails + preview).
 *
 * Chaque composant s'attend a etre rendu DANS un SlideCanvas
 * (positionnement absolu dans une virtual area 1414x1000).
 *
 * Pour l'export PDF, voir src/lib/pdf/BrandedReportPDF.tsx — meme charte
 * mais avec les composants @react-pdf au lieu de divs.
 */

import {
  BRAND_BLACK,
  BRAND_GRAY,
  BRAND_WHITE,
} from '@/lib/report-brand'
import { useBrandColor } from '@/lib/brand-color-context'
import type {
  CoverBrandSlide,
  TocBrandSlide,
  SupportIntroSlide,
  CampaignTimelineSlide,
  RegionMapSlide,
  RegionIntroSlide,
  PhotoFullSlide,
  ThanksSlide,
} from '@/lib/campaign-report-types'
import { BottomRedWave, BrandFooter, BrandFooterDark, SectionBadge, PageNumber } from './brand-parts'
import { SignedImage } from './SignedImage'
import { SLIDE_W, SLIDE_H } from './SlideCanvas'

// =========================================================================
// 1. COVER
// =========================================================================
export function CoverSlideView({ slide }: { slide: CoverBrandSlide }) {
  const { title, subtitle, clientName, coverPhotoPath } = slide.data
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Photo cover a gauche, pleine hauteur (la wave passe par-dessus en bas) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 600, height: SLIDE_H }}>
        <SignedImage
          path={coverPhotoPath}
          grayscale
          tintColor="rgba(239, 68, 68, 0.10)"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Contenu cote droit */}
      <div style={{ position: 'absolute', top: 220, left: 700, right: 80 }}>
        <h1
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 900,
            fontSize: 110,
            color: BRAND_BLACK,
            margin: 0,
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        <div style={{ marginTop: 40 }}>
          <SectionBadge label={subtitle} width={560} fontSize={28} />
        </div>
        <p
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize: 36,
            color: BRAND_BLACK,
            marginTop: 50,
            marginBottom: 0,
            lineHeight: 1,
          }}
        >
          {clientName}
        </p>
      </div>

      {/* Wave + footer */}
      <BottomRedWave />
      <BrandFooter />
    </div>
  )
}

// =========================================================================
// 2. SOMMAIRE
// =========================================================================
export function TocSlideView({ slide }: { slide: TocBrandSlide }) {
  const items = slide.data.items
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Badge centre en haut */}
      <div style={{ position: 'absolute', top: 90, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <SectionBadge label="SOMMAIRE" width={300} fontSize={26} />
      </div>

      {/* Grid 2 colonnes, lignes auto-flow. Espacement reduit si beaucoup d'items. */}
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 160,
          right: 160,
          bottom: 140,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoRows: 'min-content',
          rowGap: items.length > 4 ? 50 : 100,
          columnGap: 100,
          alignContent: 'center',
        }}
      >
        {items.map((item, idx) => (
          <TocItem key={idx} item={item} />
        ))}
      </div>

      <PageNumber n={1} />
      <BrandFooterDark />
    </div>
  )
}

function TocItem({ item }: { item: { number: string; title: string; subtitle: string } }) {
  const { red } = useBrandColor()
  return (
    <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
      <span
        style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 900,
          fontSize: 56,
          color: red,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {item.number}
      </span>
      <div>
        <div
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 900,
            fontSize: 32,
            color: BRAND_BLACK,
            lineHeight: 1.1,
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: 18,
            color: BRAND_GRAY,
            marginTop: 8,
          }}
        >
          {item.subtitle}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// 3. SUPPORT INTRO
// =========================================================================
export function SupportIntroSlideView({ slide }: { slide: SupportIntroSlide }) {
  const { sectionLabel, introText, visualPath } = slide.data
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Badge en haut a droite */}
      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <SectionBadge label={sectionLabel} width={500} fontSize={26} />
      </div>

      {/* Texte a gauche */}
      <div style={{ position: 'absolute', top: 280, left: 120, width: 560 }}>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 22,
            color: BRAND_BLACK,
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {introText || (
            <span style={{ color: BRAND_GRAY, fontStyle: 'italic' }}>
              Texte d'introduction du support a renseigner...
            </span>
          )}
        </p>
      </div>

      {/* Visuel a droite (affiche format portrait) */}
      <div style={{ position: 'absolute', top: 260, right: 160, width: 360, height: 540 }}>
        <SignedImage
          path={visualPath}
          cover
          style={{ width: '100%', height: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
        />
      </div>

      <PageNumber n={2} />
      <BrandFooterDark />
    </div>
  )
}

// =========================================================================
// 4. CAMPAGNE TIMELINE
// =========================================================================
export function CampaignTimelineSlideView({ slide }: { slide: CampaignTimelineSlide }) {
  const items = slide.data.items
  const sectionLabel = slide.data.sectionLabel || 'LA CAMPAGNE'
  const { red } = useBrandColor()
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Badge centre */}
      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <SectionBadge label={sectionLabel} width={300} fontSize={26} />
      </div>

      {/* Ligne horizontale de marque */}
      <div
        style={{
          position: 'absolute',
          top: 520,
          left: 120,
          right: 120,
          height: 2,
          backgroundColor: red,
        }}
      />

      {/* Jalons en zigzag */}
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: 120,
          right: 120,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
        }}
      >
        {items.slice(0, 5).map((item, idx) => (
          <TimelineItem key={idx} item={item} side={idx % 2 === 0 ? 'top' : 'bottom'} />
        ))}
      </div>

      <PageNumber n={3} />
      <BrandFooterDark />
    </div>
  )
}

function TimelineItem({
  item,
  side,
}: {
  item: { label: string; value: string }
  side: 'top' | 'bottom'
}) {
  const { red } = useBrandColor()
  return (
    <div style={{ position: 'relative', height: 280 }}>
      {/* Point + petite ligne reliant le jalon a la ligne principale */}
      <div
        style={{
          position: 'absolute',
          top: side === 'top' ? 140 : 0,
          left: '50%',
          width: 2,
          height: 130,
          backgroundColor: BRAND_BLACK,
          transform: 'translateX(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: side === 'top' ? 130 : 130,
          left: '50%',
          width: 14,
          height: 14,
          backgroundColor: red,
          transform: 'translateX(-50%) rotate(45deg)',
        }}
      />

      {/* Texte */}
      <div
        style={{
          position: 'absolute',
          top: side === 'top' ? 0 : 175,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: '0 12px',
        }}
      >
        {item.label && (
          <div
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 18,
              color: red,
              marginBottom: 8,
            }}
          >
            {item.label}
          </div>
        )}
        <div
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize: item.label ? 18 : 22,
            color: BRAND_BLACK,
            lineHeight: 1.2,
          }}
        >
          {item.value}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// 5. REGION MAP
// =========================================================================
export function RegionMapSlideView({ slide }: { slide: RegionMapSlide }) {
  const { region, mapImageUrl, description } = slide.data
  const regionLabel = slide.data.regionLabel || region
  const sectionLabel = slide.data.sectionLabel || 'ZONE DE DIFFUSION'
  const zoomTitle = slide.data.zoomTitle || 'Zoom sur la zone de diffusion'
  const { red } = useBrandColor()
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Badge en haut a droite */}
      <div style={{ position: 'absolute', top: 100, right: 160 }}>
        <SectionBadge label={sectionLabel} width={400} fontSize={22} />
      </div>

      {/* Nom region a gauche */}
      <h2
        style={{
          position: 'absolute',
          top: 100,
          left: 120,
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 900,
          fontSize: 46,
          color: BRAND_BLACK,
          margin: 0,
          width: 500,
          lineHeight: 1.1,
        }}
      >
        {regionLabel}
      </h2>

      {/* Carte */}
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: 120,
          width: 720,
          height: 600,
          backgroundColor: '#F3F4F6',
          overflow: 'hidden',
        }}
      >
        {mapImageUrl ? (
          <img src={mapImageUrl} alt={`Carte ${region}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: BRAND_GRAY,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Carte indisponible
          </div>
        )}
      </div>

      {/* Zoom info a droite */}
      <div style={{ position: 'absolute', top: 360, left: 900, width: 380 }}>
        <h3
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 900,
            fontSize: 26,
            color: red,
            margin: 0,
          }}
        >
          {zoomTitle}
        </h3>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 18,
            color: BRAND_BLACK,
            lineHeight: 1.5,
            marginTop: 16,
            marginBottom: 24,
          }}
        >
          {description}
        </p>
      </div>

      <PageNumber n={4} />
      <BrandFooterDark />
    </div>
  )
}

// =========================================================================
// 6. REGION INTRO
// =========================================================================
export function RegionIntroSlideView({ slide }: { slide: RegionIntroSlide }) {
  const { region, backgroundPhotoPath } = slide.data
  const regionLabel = slide.data.regionLabel || region
  const sectionLabel = slide.data.sectionLabel || 'LES PHOTOS'
  const footerNote = slide.data.footerNote || 'Un aperçu de votre campagne publicitaire'
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Photo background BW + tint, occupant haut + gauche */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: SLIDE_W, height: 700 }}>
        <SignedImage
          path={backgroundPhotoPath}
          grayscale
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Vague blanche separatrice */}
      <svg
        width={SLIDE_W}
        height={140}
        viewBox={`0 0 ${SLIDE_W} 140`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 620, left: 0 }}
      >
        <path d={`M0,40 C400,140 1000,0 ${SLIDE_W},80 L${SLIDE_W},140 L0,140 Z`} fill={BRAND_WHITE} />
      </svg>

      {/* Region name en bas a gauche */}
      <h2
        style={{
          position: 'absolute',
          bottom: 130,
          left: 120,
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 900,
          fontSize: 56,
          color: BRAND_BLACK,
          margin: 0,
          lineHeight: 1,
          maxWidth: 700,
        }}
      >
        {regionLabel}
      </h2>

      {/* Badge section en bas a droite */}
      <div style={{ position: 'absolute', bottom: 220, right: 100 }}>
        <SectionBadge label={sectionLabel} width={300} fontSize={26} />
      </div>

      {/* Sous-titre */}
      <p
        style={{
          position: 'absolute',
          bottom: 130,
          right: 100,
          width: 300,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: 16,
          color: BRAND_GRAY,
          textAlign: 'right',
          margin: 0,
        }}
      >
        {footerNote}
      </p>

      <PageNumber n={5} />
    </div>
  )
}

// =========================================================================
// 7. PHOTO FULL
// =========================================================================
export function PhotoFullSlideView({ slide }: { slide: PhotoFullSlide }) {
  const { photoPath, caption } = slide.data
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Photo centree avec padding */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 60,
          right: 60,
          bottom: caption ? 140 : 60,
        }}
      >
        <SignedImage path={photoPath} cover style={{ width: '100%', height: '100%' }} />
      </div>

      {caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 60,
            right: 60,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: 18,
            color: BRAND_BLACK,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}

// =========================================================================
// 8. THANKS
// =========================================================================
export function ThanksSlideView({ slide }: { slide: ThanksSlide }) {
  const { headline, subtext, contactName, contactEmail, contactPhone, linkedinUrl, websiteUrl } = slide.data
  const { red } = useBrandColor()
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', backgroundColor: BRAND_WHITE }}>
      {/* Headline rouge a gauche */}
      <h1
        style={{
          position: 'absolute',
          top: 220,
          left: 120,
          width: 700,
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 900,
          fontSize: 84,
          color: red,
          margin: 0,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
        }}
      >
        {headline}
      </h1>

      <p
        style={{
          position: 'absolute',
          top: 480,
          left: 120,
          width: 600,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: 20,
          color: BRAND_BLACK,
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        {subtext}
      </p>

      {/* Contact a droite */}
      <div style={{ position: 'absolute', top: 220, right: 120, width: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 24, backgroundColor: red }} />
          <span
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: red,
            }}
          >
            Votre interlocuteur
          </span>
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize: 22,
            color: BRAND_BLACK,
          }}
        >
          {contactName || '—'}
        </div>
        {contactEmail && (
          <div
            style={{
              marginTop: 8,
              fontFamily: 'Inter, sans-serif',
              fontSize: 18,
              color: red,
              textDecoration: 'underline',
            }}
          >
            {contactEmail}
          </div>
        )}
        {contactPhone && (
          <div
            style={{
              marginTop: 6,
              fontFamily: 'Inter, sans-serif',
              fontSize: 18,
              color: BRAND_BLACK,
            }}
          >
            {contactPhone}
          </div>
        )}

        {(linkedinUrl || websiteUrl) && (
          <>
            <div style={{ marginTop: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 24, backgroundColor: red }} />
              <span
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 700,
                  fontSize: 22,
                  color: red,
                }}
              >
                Nous retrouver
              </span>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
              {linkedinUrl && <SocialIcon kind="in" />}
              {websiteUrl && <SocialIcon kind="web" />}
            </div>
          </>
        )}
      </div>

      <BottomRedWave />
      <BrandFooter />
    </div>
  )
}

function SocialIcon({ kind }: { kind: 'in' | 'web' }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        backgroundColor: BRAND_BLACK,
        color: BRAND_WHITE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: 16,
      }}
    >
      {kind === 'in' ? 'in' : '🌐'}
    </div>
  )
}

// =========================================================================
// Dispatcher : prend une slide quelconque, retourne le bon view
// =========================================================================
import type { BrandedSlide } from '@/lib/campaign-report-types'

export function SlideView({ slide }: { slide: BrandedSlide }) {
  switch (slide.type) {
    case 'cover_brand':
      return <CoverSlideView slide={slide} />
    case 'toc_brand':
      return <TocSlideView slide={slide} />
    case 'support_intro':
      return <SupportIntroSlideView slide={slide} />
    case 'campaign_timeline':
      return <CampaignTimelineSlideView slide={slide} />
    case 'region_map':
      return <RegionMapSlideView slide={slide} />
    case 'region_intro':
      return <RegionIntroSlideView slide={slide} />
    case 'photo_full':
      return <PhotoFullSlideView slide={slide} />
    case 'thanks':
      return <ThanksSlideView slide={slide} />
  }
}

/** Label humain pour les thumbnails. */
export function getSlideLabel(slide: BrandedSlide): string {
  switch (slide.type) {
    case 'cover_brand': return 'Couverture'
    case 'toc_brand': return 'Sommaire'
    case 'support_intro': return 'Le support'
    case 'campaign_timeline': return 'La campagne'
    case 'region_map': return `Carte — ${slide.data.region}`
    case 'region_intro': return `Photos — ${slide.data.region}`
    case 'photo_full': return slide.data.region ? `Photo — ${slide.data.region}` : 'Photo'
    case 'thanks': return 'Merci'
  }
}

// Re-export for convenience
export { SLIDE_W, SLIDE_H }
