import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

const c = {
  primary: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  accent: '#2563EB',
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: c.primary },
  // Header
  headerSection: { marginBottom: 24 },
  title: { fontSize: 18, fontWeight: 'bold', color: c.accent, marginBottom: 8 },
  campaignName: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 4 },
  metaLabel: { fontSize: 8, color: c.muted },
  metaValue: { fontSize: 8, fontWeight: 'bold' },
  // Table
  tableSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  thead: { flexDirection: 'row', backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 5 },
  th: { fontSize: 7, fontWeight: 'bold', color: c.muted, textTransform: 'uppercase' },
  trow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 5 },
  td: { fontSize: 8 },
  colRef: { width: 80 },
  colName: { flex: 1 },
  colCity: { width: 80 },
  colDate: { width: 70, textAlign: 'right' },
  // Photos
  photosSection: { marginBottom: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoItem: { width: '23%', aspectRatio: 1 },
  photo: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 3 },
  // Text
  textSection: { marginBottom: 16 },
  textContent: { fontSize: 9, lineHeight: 1.6, color: c.primary },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerText: { fontSize: 7, color: c.muted, textAlign: 'center', borderTopWidth: 0.5, borderTopColor: c.border, paddingTop: 6 },
})

export interface ProofData {
  campaignName: string
  clientName: string
  startDate: string
  endDate: string
  panels: {
    reference: string
    name: string | null
    city: string | null
    assignedAt: string
  }[]
  photoUrls: string[]
  texts: string[]
  mapImageUrl?: string | null
  blockOrder: string[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function HeaderBlock({ data }: { data: ProofData }) {
  return (
    <View style={s.headerSection}>
      <Text style={s.title}>Justificatif de pose</Text>
      <Text style={s.campaignName}>{data.campaignName}</Text>
      <View style={s.metaRow}>
        <View>
          <Text style={s.metaLabel}>Client</Text>
          <Text style={s.metaValue}>{data.clientName}</Text>
        </View>
        <View>
          <Text style={s.metaLabel}>Période</Text>
          <Text style={s.metaValue}>
            {formatDate(data.startDate)} — {formatDate(data.endDate)}
          </Text>
        </View>
        <View>
          <Text style={s.metaLabel}>Panneaux posés</Text>
          <Text style={s.metaValue}>{data.panels.length}</Text>
        </View>
      </View>
    </View>
  )
}

function TableBlock({ panels }: { panels: ProofData['panels'] }) {
  return (
    <View style={s.tableSection}>
      <Text style={s.sectionTitle}>Panneaux posés</Text>
      <View style={s.thead}>
        <Text style={[s.th, s.colRef]}>Référence</Text>
        <Text style={[s.th, s.colName]}>Nom</Text>
        <Text style={[s.th, s.colCity]}>Ville</Text>
        <Text style={[s.th, s.colDate]}>Date pose</Text>
      </View>
      {panels.map((p, i) => (
        <View key={i} style={s.trow}>
          <Text style={[s.td, s.colRef, { fontWeight: 'bold' }]}>{p.reference}</Text>
          <Text style={[s.td, s.colName, { color: c.muted }]}>{p.name || '—'}</Text>
          <Text style={[s.td, s.colCity, { color: c.muted }]}>{p.city || '—'}</Text>
          <Text style={[s.td, s.colDate, { color: c.muted }]}>{formatDate(p.assignedAt)}</Text>
        </View>
      ))}
    </View>
  )
}

function PhotosBlock({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null
  return (
    <View style={s.photosSection} wrap={false}>
      <Text style={s.sectionTitle}>Photos de pose ({urls.length})</Text>
      <View style={s.photoGrid}>
        {urls.map((url, i) => (
          <View key={i} style={s.photoItem}>
            <Image src={url} style={s.photo} />
          </View>
        ))}
      </View>
    </View>
  )
}

function TextBlock({ content }: { content: string }) {
  return (
    <View style={s.textSection}>
      <Text style={s.textContent}>{content}</Text>
    </View>
  )
}

function MapBlock({ url }: { url: string }) {
  return (
    <View style={s.photosSection} wrap={false}>
      <Text style={s.sectionTitle}>Carte des panneaux</Text>
      <Image src={url} style={{ width: '100%', height: 200, objectFit: 'contain', borderRadius: 3 }} />
    </View>
  )
}

export function ProofPDF({ data }: { data: ProofData }) {
  // Render blocks in order, deduplicating by type tracking
  let textIndex = 0
  // Split photos into chunks of 8 for page breaks
  const photoChunks: string[][] = []
  for (let i = 0; i < data.photoUrls.length; i += 8) {
    photoChunks.push(data.photoUrls.slice(i, i + 8))
  }
  let photoChunkIndex = 0

  const renderedBlocks = data.blockOrder.map((type, i) => {
    if (type === 'header') {
      return <HeaderBlock key={i} data={data} />
    }
    if (type === 'table') {
      return <TableBlock key={i} panels={data.panels} />
    }
    if (type === 'photos') {
      const chunk = photoChunks[photoChunkIndex]
      photoChunkIndex++
      if (!chunk || chunk.length === 0) return null
      return <PhotosBlock key={i} urls={chunk} />
    }
    if (type === 'text') {
      const text = data.texts[textIndex]
      textIndex++
      if (!text) return null
      return <TextBlock key={i} content={text} />
    }
    if (type === 'map' && data.mapImageUrl) {
      return <MapBlock key={i} url={data.mapImageUrl} />
    }
    return null
  })

  // If more photo chunks remain, add them
  const extraPhotoBlocks = photoChunks.slice(photoChunkIndex).map((chunk, i) => (
    <PhotosBlock key={`extra-photos-${i}`} urls={chunk} />
  ))

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {renderedBlocks}
        {extraPhotoBlocks}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Justificatif de pose — {data.campaignName} — {data.clientName} — Généré le{' '}
            {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
