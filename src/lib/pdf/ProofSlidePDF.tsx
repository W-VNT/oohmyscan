import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import type { Slide, SlideElement, KpiMetric } from '@/pages/admin/reports/ProofOfPostingPage'

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

const s = StyleSheet.create({
  page: { flexDirection: 'column', fontFamily: 'Helvetica', fontSize: 10, color: '#0F172A' },
  // Couverture header
  coverHeader: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  // Standard header
  stdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40, paddingTop: 20, paddingBottom: 10 },
  // Content area
  content: { flex: 1, paddingHorizontal: 40, paddingVertical: 10 },
  contentCenter: { flex: 1, paddingHorizontal: 40, justifyContent: 'center', alignItems: 'center' },
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#D1D5DB' },
  footerText: { fontSize: 7, color: '#64748B' },
  // Elements
  text: { fontSize: 10, lineHeight: 1.5, marginBottom: 8 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  kpiCard: { flex: 1, borderWidth: 0.5, borderColor: '#D1D5DB', borderRadius: 6, padding: 12, alignItems: 'center' },
  kpiValue: { fontSize: 24, fontWeight: 'bold' },
  kpiLabel: { fontSize: 8, color: '#64748B', marginTop: 4 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#D1D5DB' },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  tableCell: { fontSize: 8 },
  tableCellBold: { fontSize: 8, fontWeight: 'bold' },
  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
})

interface ProofSlidePDFProps {
  slides: Slide[]
  kpiData: Record<KpiMetric, { value: string; label: string }>
  logoUrl: string | null
  companyName: string
  campaignName: string
  getPhotoUrl: (path: string) => string
  photos: { id: string; storage_path: string }[]
  assignments: { id: string; assigned_at: string; panels: { reference: string; name: string | null; city: string | null; lat: number; lng: number } | null }[]
}

export function ProofSlidePDF({ slides, kpiData, logoUrl, companyName, campaignName, getPhotoUrl, photos, assignments }: ProofSlidePDFProps) {
  return (
    <Document>
      {slides.map((slide, slideIdx) => (
        <Page key={slide.id} size="A4" orientation="landscape" style={s.page}>
          {/* Background image for pleine_image */}
          {slide.layout === 'pleine_image' && slide.bgImageUrl && (
            <Image src={slide.bgImageUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          )}

          {/* Header */}
          {slide.layout === 'couverture' && (
            <View style={s.coverHeader}>
              {logoUrl && <Image src={logoUrl} style={{ width: 160, height: 50, objectFit: 'contain' }} />}
            </View>
          )}
          {slide.layout === 'standard' && (
            <View style={s.stdHeader}>
              {logoUrl && <Image src={logoUrl} style={{ width: 80, height: 25, objectFit: 'contain' }} />}
              <Text style={{ fontSize: 8, color: '#64748B' }}>{campaignName}</Text>
            </View>
          )}

          {/* Content */}
          <View style={slide.layout === 'couverture' || slide.layout === 'pleine_image' ? s.contentCenter : s.content}>
            {slide.elements.map((el) => (
              <View key={el.id} style={{ marginBottom: 8 }}>
                {renderElement(el, kpiData, getPhotoUrl, photos, assignments)}
              </View>
            ))}
          </View>

          {/* Footer */}
          {(slide.layout === 'couverture' || slide.layout === 'standard') && (
            <View style={s.footer}>
              <Text style={s.footerText}>{companyName}</Text>
              <Text style={s.footerText}>{campaignName}</Text>
              <Text style={s.footerText}>Slide {slideIdx + 1} / {slides.length}</Text>
            </View>
          )}
        </Page>
      ))}
    </Document>
  )
}

function renderElement(
  el: SlideElement,
  kpiData: Record<KpiMetric, { value: string; label: string }>,
  getPhotoUrl: (path: string) => string,
  photos: { id: string; storage_path: string }[],
  assignments: { id: string; assigned_at: string; panels: { reference: string; name: string | null; city: string | null; lat: number; lng: number } | null }[],
) {
  switch (el.type) {
    case 'logo':
      return null // Logo is handled by layout header

    case 'text':
      return <Text style={s.text}>{el.content.replace(/<[^>]+>/g, '')}</Text>

    case 'kpi':
      return (
        <View style={s.kpiRow}>
          {el.metrics.map((metric, i) => (
            <View key={i} style={s.kpiCard}>
              <Text style={s.kpiValue}>{kpiData[metric]?.value ?? '—'}</Text>
              <Text style={s.kpiLabel}>{kpiData[metric]?.label ?? ''}</Text>
            </View>
          ))}
        </View>
      )

    case 'table':
      return (
        <View>
          <View style={s.tableHeader}>
            <Text style={[s.tableCellBold, { width: '20%' }]}>Réf.</Text>
            <Text style={[s.tableCellBold, { width: '30%' }]}>Nom</Text>
            <Text style={[s.tableCellBold, { width: '25%' }]}>Ville</Text>
            <Text style={[s.tableCellBold, { width: '25%' }]}>Date pose</Text>
          </View>
          {assignments.map((a) => (
            <View key={a.id} style={s.tableRow}>
              <Text style={[s.tableCell, { width: '20%' }]}>{a.panels?.reference ?? '—'}</Text>
              <Text style={[s.tableCell, { width: '30%' }]}>{a.panels?.name ?? '—'}</Text>
              <Text style={[s.tableCell, { width: '25%' }]}>{a.panels?.city ?? '—'}</Text>
              <Text style={[s.tableCell, { width: '25%' }]}>{new Date(a.assigned_at).toLocaleDateString('fr-FR')}</Text>
            </View>
          ))}
        </View>
      )

    case 'photos': {
      const selectedPhotos = photos.filter((p) => el.photoIds.includes(p.id))
      const allUrls = [
        ...selectedPhotos.map((p) => getPhotoUrl(p.storage_path)),
        ...el.uploadedUrls,
      ].slice(0, el.layout)

      const photoWidth = el.layout <= 2 ? '48%' : '23%'

      return (
        <View style={s.photoGrid}>
          {allUrls.map((url, i) => (
            <Image key={i} src={url} style={{ width: photoWidth, height: 120, objectFit: 'cover', borderRadius: 4 }} />
          ))}
        </View>
      )
    }

    case 'map': {
      const MAPBOX = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_MAPBOX_TOKEN : null
      const coords = assignments.filter((a) => a.panels?.lat && a.panels?.lng).map((a) => a.panels!)
      if (!MAPBOX || coords.length === 0) return null
      const markers = coords.map((p) => `pin-s+2563EB(${p.lng},${p.lat})`).join(',')
      const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${markers}/auto/800x400@2x?padding=40&access_token=${MAPBOX}`
      return <Image src={mapUrl} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 4 }} />
    }

    default:
      return null
  }
}
