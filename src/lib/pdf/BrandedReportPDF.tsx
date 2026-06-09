/**
 * Export PDF du rapport campagne charte OOH MY AD !
 *
 * Architecture :
 *   - exportBrandedReport(slides) : fonction publique, resout les URLs signees,
 *     rend le Document et retourne un Blob
 *   - Composants internes : un par type de slide, equivalents PDF des SlideViews HTML
 *
 * Police : Helvetica par defaut (built-in @react-pdf). Poppins peut etre
 * branchee en fournissant un TTF dans public/fonts (a venir en polish).
 */

import { Document, Page, View, Text, Image, StyleSheet, Svg, Path, Font, pdf } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'

// Register Poppins (TTF bundles dans public/fonts/). On enregistre les deux
// poids comme deux familles separees pour simplifier l'usage : font-family =
// "Poppins-Bold" ou "Poppins-Black" directement dans les styles.
const FONT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''
Font.register({ family: 'Poppins-Bold',  src: `${FONT_ORIGIN}/fonts/Poppins-Bold.ttf` })
Font.register({ family: 'Poppins-Black', src: `${FONT_ORIGIN}/fonts/Poppins-Black.ttf` })
import {
  BRAND_RED,
  BRAND_BLACK,
  BRAND_GRAY,
  BRAND_WHITE,
  A4_LANDSCAPE_PT,
  BRAND_NAME,
  BRAND_TAGLINE,
  deriveBrandPalette,
} from '@/lib/report-brand'
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

const W = A4_LANDSCAPE_PT.width // 842 pt
const H = A4_LANDSCAPE_PT.height // 595 pt

// Echelle : nos slides views sont concues a 1414x1000. On scale tout par 595/1000 ≈ 0.595
// Tous les magic numbers sont reproduits a l'echelle PDF directement.

const styles = StyleSheet.create({
  page: { backgroundColor: BRAND_WHITE, position: 'relative', flexDirection: 'column' },
})

interface ResolvedSlide {
  slide: BrandedSlide
  /** Pour chaque storage_path utilise par cette slide, l'URL signee resolue. */
  signedUrls: Record<string, string>
}

/**
 * Point d'entree : prend l'array de slides + couleur de marque, resout les URLs
 * signees, rend le Document et retourne un Blob.
 *
 * @param slides     Slides du rapport
 * @param brandColor Couleur principale (hex avec #). Defaut: BRAND_RED.
 */
export async function exportBrandedReport(
  slides: BrandedSlide[],
  brandColor: string = BRAND_RED,
): Promise<Blob> {
  // 1. Derive la palette
  const palette = deriveBrandPalette(brandColor)

  // 2. Resout toutes les URLs signees en parallele
  const resolved = await Promise.all(slides.map(resolveSlidePaths))

  // 3. Rend le PDF
  const doc = (
    <Document>
      {resolved.map((rs, i) => (
        <Page key={i} size={{ width: W, height: H }} style={styles.page}>
          <SlidePdf slide={rs.slide} signedUrls={rs.signedUrls} pageNumber={i + 1} palette={palette} />
        </Page>
      ))}
    </Document>
  )

  return await pdf(doc).toBlob()
}

interface Palette {
  red: string
  redLight: string
  redPale: string
}

/**
 * Convertit une URL d'image en data URL grayscale via un canvas.
 * Necessaire car @react-pdf/renderer ne supporte pas les filtres CSS sur les images.
 */
async function fetchAsGrayscaleDataUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`fetch image ${response.status}`)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      // Note : `Image` import @react-pdf shadow le global, on passe par createElement
      const i = document.createElement('img')
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = objectUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No canvas context')
    ctx.filter = 'grayscale(100%)'
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function resolveSlidePaths(slide: BrandedSlide): Promise<ResolvedSlide> {
  // Path -> kind ('normal' | 'grayscale')
  const pathsToResolve: Array<{ path: string; grayscale: boolean }> = []
  switch (slide.type) {
    case 'cover_brand':
      if (slide.data.coverPhotoPath) pathsToResolve.push({ path: slide.data.coverPhotoPath, grayscale: true })
      break
    case 'support_intro':
      if (slide.data.visualPath) pathsToResolve.push({ path: slide.data.visualPath, grayscale: false })
      break
    case 'region_intro':
      if (slide.data.backgroundPhotoPath) pathsToResolve.push({ path: slide.data.backgroundPhotoPath, grayscale: true })
      break
    case 'photo_full':
      pathsToResolve.push({ path: slide.data.photoPath, grayscale: false })
      break
  }
  const signedUrls: Record<string, string> = {}
  await Promise.all(
    pathsToResolve.map(async ({ path, grayscale }) => {
      const { data } = await supabase.storage.from('panel-photos').createSignedUrl(path, 3600)
      if (!data?.signedUrl) return
      if (grayscale) {
        try {
          signedUrls[path] = await fetchAsGrayscaleDataUrl(data.signedUrl)
        } catch {
          // Fallback : URL signee couleur si la conversion echoue (CORS, etc.)
          signedUrls[path] = data.signedUrl
        }
      } else {
        signedUrls[path] = data.signedUrl
      }
    }),
  )
  return { slide, signedUrls }
}

// =========================================================================
// Slide dispatcher
// =========================================================================
function SlidePdf({
  slide,
  signedUrls,
  pageNumber,
  palette,
}: {
  slide: BrandedSlide
  signedUrls: Record<string, string>
  pageNumber: number
  palette: Palette
}) {
  switch (slide.type) {
    case 'cover_brand': return <CoverPdf slide={slide} signedUrls={signedUrls} palette={palette} />
    case 'toc_brand': return <TocPdf slide={slide} pageNumber={pageNumber} palette={palette} />
    case 'support_intro': return <SupportIntroPdf slide={slide} signedUrls={signedUrls} pageNumber={pageNumber} palette={palette} />
    case 'campaign_timeline': return <CampaignTimelinePdf slide={slide} pageNumber={pageNumber} palette={palette} />
    case 'region_map': return <RegionMapPdf slide={slide} pageNumber={pageNumber} palette={palette} />
    case 'region_intro': return <RegionIntroPdf slide={slide} signedUrls={signedUrls} pageNumber={pageNumber} palette={palette} />
    case 'photo_full': return <PhotoFullPdf slide={slide} signedUrls={signedUrls} />
    case 'thanks': return <ThanksPdf slide={slide} palette={palette} />
  }
}

// =========================================================================
// Brand parts (PDF version) — palette injected via props
// =========================================================================
function BottomRedWavePdf({ palette }: { palette: Palette }) {
  return (
    <Svg viewBox={`0 0 ${W} 120`} style={{ position: 'absolute', bottom: 0, left: 0, width: W, height: 120 }}>
      <Path d={`M0,48 C180,0 480,90 ${W},24 L${W},120 L0,120 Z`} fill={palette.red} />
    </Svg>
  )
}

function BrandFooterPdf({ dark = false }: { dark?: boolean }) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: dark ? 14 : 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 14,
          height: 14,
          backgroundColor: dark ? BRAND_BLACK : BRAND_WHITE,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 7,
        }}
      >
        {/* Carre interne du logo : TOUJOURS rouge OOH (identite de marque, non themable) */}
        <View style={{ width: 7, height: 7, backgroundColor: BRAND_RED }} />
      </View>
      <View>
        <Text
          style={{
            fontFamily: 'Poppins-Bold',
            fontSize: 11,
            color: dark ? BRAND_BLACK : BRAND_WHITE,
            letterSpacing: 0.5,
          }}
        >
          {BRAND_NAME}
        </Text>
        {!dark && (
          <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: BRAND_WHITE, marginTop: 1 }}>
            {BRAND_TAGLINE}
          </Text>
        )}
      </View>
    </View>
  )
}

function SectionBadgePdf({ label, palette, width = 230, fontSize = 14 }: { label: string; palette: Palette; width?: number; fontSize?: number }) {
  return (
    <View style={{ position: 'relative', width, height: 42 }}>
      <View
        style={{
          position: 'absolute',
          top: 7,
          left: 7,
          width,
          height: 42,
          backgroundColor: palette.redLight,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: 42,
          backgroundColor: palette.red,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Poppins-Bold', fontSize, color: BRAND_WHITE, letterSpacing: 0.8 }}>
          {label}
        </Text>
      </View>
    </View>
  )
}

function PageNumberPdf({ n, palette }: { n: number; palette: Palette }) {
  return (
    <Text
      style={{
        position: 'absolute',
        bottom: 14,
        right: 22,
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        color: palette.red,
      }}
    >
      {n}
    </Text>
  )
}

// =========================================================================
// 1. COVER
// =========================================================================
function CoverPdf({
  slide,
  signedUrls,
  palette,
}: {
  slide: CoverBrandSlide
  signedUrls: Record<string, string>
  palette: Palette
}) {
  const { title, subtitle, clientName, coverPhotoPath } = slide.data
  const coverUrl = coverPhotoPath ? signedUrls[coverPhotoPath] : null
  return (
    <>
      {/* Photo gauche pleine hauteur, la wave passe par-dessus en bas */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: 358, height: H }}>
        {coverUrl ? (
          <Image src={coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <View style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6' }} />
        )}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 358,
            height: H,
            backgroundColor: palette.red,
            opacity: 0.08,
          }}
        />
      </View>

      <View style={{ position: 'absolute', top: 130, left: 420 }}>
        <Text style={{ fontFamily: 'Poppins-Black', fontSize: 66, color: BRAND_BLACK }}>{title}</Text>
        <View style={{ marginTop: 22 }}>
          <SectionBadgePdf label={subtitle} palette={palette} width={335} fontSize={17} />
        </View>
        <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 22, color: BRAND_BLACK, marginTop: 30 }}>
          {clientName}
        </Text>
      </View>

      <BottomRedWavePdf palette={palette} />
      <BrandFooterPdf />
    </>
  )
}

// =========================================================================
// 2. SOMMAIRE
// =========================================================================
function TocPdf({ slide, pageNumber, palette }: { slide: TocBrandSlide; pageNumber: number; palette: Palette }) {
  return (
    <>
      <View style={{ position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center' }}>
        <SectionBadgePdf label="SOMMAIRE" palette={palette} width={180} fontSize={16} />
      </View>

      <View
        style={{
          position: 'absolute',
          top: 145,
          left: 96,
          right: 96,
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {slide.data.items.map((item, idx) => (
          <View
            key={idx}
            style={{
              width: '50%',
              paddingRight: 30,
              marginBottom: slide.data.items.length > 4 ? 30 : 60,
              flexDirection: 'row',
            }}
          >
            <Text
              style={{
                fontFamily: 'Poppins-Black',
                fontSize: 34,
                color: palette.red,
                marginRight: 18,
              }}
            >
              {item.number}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 18, color: BRAND_BLACK }}>
                {item.title}
              </Text>
              <Text
                style={{
                  fontFamily: 'Helvetica',
                  fontSize: 10,
                  color: BRAND_GRAY,
                  marginTop: 4,
                }}
              >
                {item.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <PageNumberPdf n={pageNumber - 1} palette={palette} />
      <BrandFooterPdf dark />
    </>
  )
}

// =========================================================================
// 3. SUPPORT INTRO
// =========================================================================
function SupportIntroPdf({
  slide,
  signedUrls,
  pageNumber,
  palette,
}: {
  slide: SupportIntroSlide
  signedUrls: Record<string, string>
  pageNumber: number
  palette: Palette
}) {
  const { sectionLabel, introText, visualPath } = slide.data
  const visualUrl = visualPath ? signedUrls[visualPath] : null
  return (
    <>
      <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }}>
        <SectionBadgePdf label={sectionLabel} palette={palette} width={300} fontSize={16} />
      </View>

      <View style={{ position: 'absolute', top: 170, left: 72, width: 335 }}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 13, color: BRAND_BLACK, lineHeight: 1.5 }}>
          {introText}
        </Text>
      </View>

      <View style={{ position: 'absolute', top: 155, right: 95, width: 215, height: 322 }}>
        {visualUrl ? (
          <Image src={visualUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <View style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6' }} />
        )}
      </View>

      <PageNumberPdf n={pageNumber - 1} palette={palette} />
      <BrandFooterPdf dark />
    </>
  )
}

// =========================================================================
// 4. CAMPAIGN TIMELINE
// =========================================================================
function CampaignTimelinePdf({ slide, pageNumber, palette }: { slide: CampaignTimelineSlide; pageNumber: number; palette: Palette }) {
  const items = slide.data.items.slice(0, 5)
  const sectionLabel = slide.data.sectionLabel || 'LA CAMPAGNE'
  const itemWidth = (W - 144) / 5
  return (
    <>
      <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }}>
        <SectionBadgePdf label={sectionLabel} palette={palette} width={180} fontSize={16} />
      </View>

      <View style={{ position: 'absolute', top: 312, left: 72, right: 72, height: 1, backgroundColor: palette.red }} />

      {items.map((item, idx) => {
        const isTop = idx % 2 === 0
        const left = 72 + idx * itemWidth
        return (
          <View key={idx}>
            <View
              style={{
                position: 'absolute',
                top: 308,
                left: left + itemWidth / 2 - 4,
                width: 8,
                height: 8,
                backgroundColor: palette.red,
                transform: 'rotate(45deg)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: isTop ? 230 : 312,
                left: left + itemWidth / 2 - 0.5,
                width: 1,
                height: 80,
                backgroundColor: BRAND_BLACK,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: isTop ? 175 : 340,
                left,
                width: itemWidth,
                alignItems: 'center',
                paddingHorizontal: 6,
              }}
            >
              {item.label ? (
                <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 11, color: palette.red, marginBottom: 4 }}>
                  {item.label}
                </Text>
              ) : null}
              <Text
                style={{
                  fontFamily: 'Poppins-Bold',
                  fontSize: 11,
                  color: BRAND_BLACK,
                  textAlign: 'center',
                }}
              >
                {item.value}
              </Text>
            </View>
          </View>
        )
      })}

      <PageNumberPdf n={pageNumber - 1} palette={palette} />
      <BrandFooterPdf dark />
    </>
  )
}

// =========================================================================
// 5. REGION MAP
// =========================================================================
function RegionMapPdf({ slide, pageNumber, palette }: { slide: RegionMapSlide; pageNumber: number; palette: Palette }) {
  const { region, mapImageUrl, description } = slide.data
  const regionLabel = slide.data.regionLabel || region
  const sectionLabel = slide.data.sectionLabel || 'ZONE DE DIFFUSION'
  const zoomTitle = slide.data.zoomTitle || 'Zoom sur la zone de diffusion'
  return (
    <>
      <View style={{ position: 'absolute', top: 60, right: 95 }}>
        <SectionBadgePdf label={sectionLabel} palette={palette} width={240} fontSize={13} />
      </View>

      <Text
        style={{
          position: 'absolute',
          top: 60,
          left: 72,
          fontFamily: 'Poppins-Black',
          fontSize: 28,
          color: BRAND_BLACK,
          width: 300,
        }}
      >
        {regionLabel}
      </Text>

      <View
        style={{
          position: 'absolute',
          top: 143,
          left: 72,
          width: 430,
          height: 358,
          backgroundColor: '#F3F4F6',
        }}
      >
        {mapImageUrl && (
          <Image src={mapImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </View>

      <View style={{ position: 'absolute', top: 215, left: 535, width: 230 }}>
        <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 16, color: palette.red }}>
          {zoomTitle}
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 11, color: BRAND_BLACK, lineHeight: 1.5, marginTop: 12 }}>
          {description}
        </Text>
      </View>

      <PageNumberPdf n={pageNumber - 1} palette={palette} />
      <BrandFooterPdf dark />
    </>
  )
}

// =========================================================================
// 6. REGION INTRO
// =========================================================================
function RegionIntroPdf({
  slide,
  signedUrls,
  pageNumber,
  palette,
}: {
  slide: RegionIntroSlide
  signedUrls: Record<string, string>
  pageNumber: number
  palette: Palette
}) {
  const { region, backgroundPhotoPath } = slide.data
  const regionLabel = slide.data.regionLabel || region
  const sectionLabel = slide.data.sectionLabel || 'LES PHOTOS'
  const footerNote = slide.data.footerNote || 'Un aperçu de votre campagne publicitaire'
  const bgUrl = backgroundPhotoPath ? signedUrls[backgroundPhotoPath] : null
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: 415 }}>
        {/* L'image est resolue en grayscale via canvas dans resolveSlidePaths.
            Pas besoin de tint noir d'approximation. */}
        {bgUrl && <Image src={bgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </View>

      {/* Vague blanche separatrice */}
      <Svg viewBox={`0 0 ${W} 85`} style={{ position: 'absolute', top: 368, left: 0, width: W, height: 85 }}>
        <Path d={`M0,24 C240,84 600,0 ${W},48 L${W},85 L0,85 Z`} fill={BRAND_WHITE} />
      </Svg>

      <Text
        style={{
          position: 'absolute',
          bottom: 78,
          left: 72,
          fontFamily: 'Poppins-Black',
          fontSize: 32,
          color: BRAND_BLACK,
        }}
      >
        {regionLabel}
      </Text>

      <View style={{ position: 'absolute', bottom: 130, right: 60 }}>
        <SectionBadgePdf label={sectionLabel} palette={palette} width={180} fontSize={16} />
      </View>

      <Text
        style={{
          position: 'absolute',
          bottom: 78,
          right: 60,
          width: 180,
          fontFamily: 'Helvetica',
          fontSize: 9,
          color: BRAND_GRAY,
          textAlign: 'right',
        }}
      >
        {footerNote}
      </Text>

      <PageNumberPdf n={pageNumber - 1} palette={palette} />
    </>
  )
}

// =========================================================================
// 7. PHOTO FULL
// =========================================================================
function PhotoFullPdf({
  slide,
  signedUrls,
}: {
  slide: PhotoFullSlide
  signedUrls: Record<string, string>
}) {
  const url = signedUrls[slide.data.photoPath]
  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: 36,
          left: 36,
          right: 36,
          bottom: slide.data.caption ? 80 : 36,
        }}
      >
        {url && <Image src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </View>
      {slide.data.caption && (
        <Text
          style={{
            position: 'absolute',
            bottom: 40,
            left: 36,
            right: 36,
            textAlign: 'center',
            fontFamily: 'Helvetica',
            fontSize: 10,
            color: BRAND_BLACK,
          }}
        >
          {slide.data.caption}
        </Text>
      )}
    </>
  )
}

// =========================================================================
// 8. THANKS
// =========================================================================
function ThanksPdf({ slide, palette }: { slide: ThanksSlide; palette: Palette }) {
  const { headline, subtext, contactName, contactEmail, contactPhone, linkedinUrl, websiteUrl } = slide.data
  return (
    <>
      <Text
        style={{
          position: 'absolute',
          top: 130,
          left: 72,
          width: 420,
          fontFamily: 'Poppins-Black',
          fontSize: 50,
          color: palette.red,
          lineHeight: 1.05,
        }}
      >
        {headline}
      </Text>

      <Text
        style={{
          position: 'absolute',
          top: 285,
          left: 72,
          width: 360,
          fontFamily: 'Helvetica',
          fontSize: 12,
          color: BRAND_BLACK,
          lineHeight: 1.4,
        }}
      >
        {subtext}
      </Text>

      <View style={{ position: 'absolute', top: 130, right: 72, width: 230 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 3, height: 14, backgroundColor: palette.red, marginRight: 6 }} />
          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: palette.red }}>Votre interlocuteur</Text>
        </View>
        <Text style={{ marginTop: 12, fontFamily: 'Poppins-Bold', fontSize: 13, color: BRAND_BLACK }}>
          {contactName || '—'}
        </Text>
        {contactEmail ? (
          <Text style={{ marginTop: 4, fontFamily: 'Helvetica', fontSize: 11, color: palette.red }}>
            {contactEmail}
          </Text>
        ) : null}
        {contactPhone ? (
          <Text style={{ marginTop: 3, fontFamily: 'Helvetica', fontSize: 11, color: BRAND_BLACK }}>
            {contactPhone}
          </Text>
        ) : null}

        {(linkedinUrl || websiteUrl) && (
          <>
            <View style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 3, height: 14, backgroundColor: palette.red, marginRight: 6 }} />
              <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: palette.red }}>Nous retrouver</Text>
            </View>
            <View style={{ marginTop: 10, flexDirection: 'row' }}>
              {linkedinUrl && (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: BRAND_BLACK,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 9, color: BRAND_WHITE }}>in</Text>
                </View>
              )}
              {websiteUrl && (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: BRAND_BLACK,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 9, color: BRAND_WHITE }}>www</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      <BottomRedWavePdf palette={palette} />
      <BrandFooterPdf />
    </>
  )
}
