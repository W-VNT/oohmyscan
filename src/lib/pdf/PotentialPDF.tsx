import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { formatDateFR } from './pdf-helpers'
import type { PotentialSpot } from '@/lib/potential-search'

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
  blue: '#2563EB',
  orange: '#EA580C',
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: c.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  companyBlock: { maxWidth: 240 },
  companyName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  companyLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  docBlock: { textAlign: 'right' },
  docTitle: { fontSize: 18, fontWeight: 'bold', color: c.accent, marginBottom: 6 },
  docMeta: { fontSize: 8, color: c.muted, lineHeight: 1.6 },
  separator: { borderBottomWidth: 1, borderBottomColor: c.border, marginVertical: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 10 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { width: 160, fontSize: 9, color: c.muted },
  infoValue: { fontSize: 9, fontWeight: 'bold' },
  // Summary boxes
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryBox: { flex: 1, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 4 },
  summaryLabel: { fontSize: 8, color: c.muted, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: 'bold' },
  summarySubtext: { fontSize: 7, color: c.muted, marginTop: 2 },
  // Table
  table: { marginBottom: 16 },
  thead: { flexDirection: 'row', backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 5 },
  th: { fontSize: 7, fontWeight: 'bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  trow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 5 },
  td: { fontSize: 8 },
  colRef: { width: 70 },
  colAddress: { flex: 1, paddingRight: 8 },
  colCity: { width: 80 },
  colFormat: { width: 60 },
  colName: { width: 140, paddingRight: 8 },
  colType: { width: 90 },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerLine: { borderTopWidth: 0.5, borderTopColor: c.border, paddingTop: 8 },
  footerText: { fontSize: 7, color: c.muted, textAlign: 'center', lineHeight: 1.5 },
})

export interface PotentialPDFProps {
  reference: string
  prospectName: string
  city: string
  radiusKm: number
  createdAt: string
  existingPanels: {
    reference: string
    address: string | null
    city: string | null
    format: string | null
  }[]
  potentialSpots: PotentialSpot[]
  company: {
    company_name: string | null
    address: string | null
    city: string | null
    postal_code: string | null
    siret: string | null
    tva_number: string | null
    email: string | null
    phone: string | null
    legal_mentions: string | null
    logo_url?: string | null
  }
}

export function PotentialPDF({
  reference,
  prospectName,
  city,
  radiusKm,
  createdAt,
  existingPanels,
  potentialSpots,
  company,
}: PotentialPDFProps) {
  const totalPotential = existingPanels.length + potentialSpots.length

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.companyBlock}>
            {company.logo_url && (
              <Image src={company.logo_url} style={{ width: 80, height: 40, marginBottom: 6, objectFit: 'contain' }} />
            )}
            <Text style={s.companyName}>{company.company_name ?? 'OOHMYAD'}</Text>
            {company.address && <Text style={s.companyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={s.companyLine}>{[company.postal_code, company.city].filter(Boolean).join(' ')}</Text>
            )}
            {company.siret && <Text style={s.companyLine}>SIRET : {company.siret}</Text>}
            {company.email && <Text style={s.companyLine}>{company.email}</Text>}
            {company.phone && <Text style={s.companyLine}>{company.phone}</Text>}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docTitle}>ANALYSE DE POTENTIEL</Text>
            <Text style={s.docMeta}>Réf. {reference}</Text>
            <Text style={s.docMeta}>Date : {formatDateFR(createdAt)}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Prospect</Text>
          <Text style={s.infoValue}>{prospectName}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Zone analysée</Text>
          <Text style={s.infoValue}>{city} — rayon {radiusKm} km</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Date d'analyse</Text>
          <Text style={s.infoValue}>{formatDateFR(createdAt)}</Text>
        </View>

        <View style={s.separator} />

        {/* Summary */}
        <Text style={s.sectionTitle}>Résumé</Text>
        <View style={s.summaryRow}>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Panneaux disponibles (stock existant)</Text>
            <Text style={[s.summaryValue, { color: c.blue }]}>{existingPanels.length}</Text>
            <Text style={s.summarySubtext}>Disponibles immédiatement</Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Emplacements potentiels identifiés</Text>
            <Text style={[s.summaryValue, { color: c.orange }]}>{potentialSpots.length}</Text>
            <Text style={s.summarySubtext}>Non encore installés</Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Potentiel total</Text>
            <Text style={s.summaryValue}>{totalPotential}</Text>
          </View>
        </View>

        <View style={s.separator} />

        {/* Existing panels table */}
        {existingPanels.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Détail des panneaux disponibles</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={[s.th, s.colRef]}>Référence</Text>
                <Text style={[s.th, s.colAddress]}>Adresse</Text>
                <Text style={[s.th, s.colCity]}>Ville</Text>
                <Text style={[s.th, s.colFormat]}>Format</Text>
              </View>
              {existingPanels.map((panel, i) => (
                <View key={i} style={s.trow}>
                  <Text style={[s.td, s.colRef]}>{panel.reference}</Text>
                  <Text style={[s.td, s.colAddress]}>{panel.address ?? '—'}</Text>
                  <Text style={[s.td, s.colCity]}>{panel.city ?? '—'}</Text>
                  <Text style={[s.td, s.colFormat]}>{panel.format ?? '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Potential spots table */}
        {potentialSpots.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Détail des emplacements potentiels</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={[s.th, s.colName]}>Nom du lieu</Text>
                <Text style={[s.th, s.colAddress]}>Adresse</Text>
                <Text style={[s.th, s.colType]}>Type</Text>
              </View>
              {potentialSpots.map((spot, i) => (
                <View key={i} style={s.trow}>
                  <Text style={[s.td, s.colName]}>{spot.name}</Text>
                  <Text style={[s.td, s.colAddress]}>{spot.address}</Text>
                  <Text style={[s.td, s.colType]}>{spot.typeLabel}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerLine}>
            <Text style={s.footerText}>
              Document établi par {company.company_name ?? 'OOHMYAD'} — Confidentiel
              {company.siret ? ` — SIRET ${company.siret}` : ''}
            </Text>
            {company.legal_mentions && (
              <Text style={s.footerText}>{company.legal_mentions}</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}
