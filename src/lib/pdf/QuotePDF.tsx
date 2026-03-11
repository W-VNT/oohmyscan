import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import { computeTotals, formatEUR, formatDateFR, type DocumentLine } from './pdf-helpers'

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  companyBlock: { maxWidth: 240 },
  companyName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  companyLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  docBlock: { textAlign: 'right' },
  docTitle: { fontSize: 18, fontWeight: 'bold', color: c.accent, marginBottom: 6 },
  docMeta: { fontSize: 8, color: c.muted, lineHeight: 1.6 },
  // Client
  clientSection: { marginBottom: 24 },
  clientLabel: { fontSize: 8, color: c.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  clientName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  clientLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  // Table
  table: { marginBottom: 20 },
  thead: { flexDirection: 'row', backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 6 },
  th: { fontSize: 7, fontWeight: 'bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  trow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 6, alignItems: 'center' },
  td: { fontSize: 8.5 },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 40, textAlign: 'center' },
  colUnit: { width: 45, textAlign: 'center' },
  colPU: { width: 60, textAlign: 'right' },
  colTVA: { width: 40, textAlign: 'center' },
  colTotal: { width: 70, textAlign: 'right' },
  // Totals
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  totalsBlock: { width: 240 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 8, color: c.muted },
  totalValue: { fontSize: 8.5, fontWeight: 'bold' },
  totalTTCLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1.5, borderTopColor: c.primary, marginTop: 4 },
  totalTTCLabel: { fontSize: 11, fontWeight: 'bold' },
  totalTTCValue: { fontSize: 11, fontWeight: 'bold', color: c.accent },
  // TVA recap
  tvaSection: { marginTop: 16, marginBottom: 20 },
  tvaSectionTitle: { fontSize: 8, fontWeight: 'bold', color: c.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  tvaRow: { flexDirection: 'row', paddingVertical: 3 },
  tvaCol: { width: 80, fontSize: 8 },
  // Notes
  notesSection: { marginTop: 10, marginBottom: 20 },
  notesTitle: { fontSize: 8, fontWeight: 'bold', color: c.muted, marginBottom: 4 },
  notesText: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerLine: { borderTopWidth: 0.5, borderTopColor: c.border, paddingTop: 8 },
  footerText: { fontSize: 7, color: c.muted, textAlign: 'center', lineHeight: 1.5 },
})

export interface QuotePDFProps {
  quote: {
    quote_number: string
    issued_at: string
    valid_until: string
    notes: string | null
    status: string
  }
  client: {
    company_name: string
    contact_name: string | null
    address: string | null
    city: string | null
    postal_code: string | null
    siret: string | null
    tva_number: string | null
  }
  lines: DocumentLine[]
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
  }
}

export function QuotePDF({ quote, client, lines, company }: QuotePDFProps) {
  const { totalHT, totalTTC, groups } = computeTotals(lines)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{company.company_name ?? 'OOHMYAD'}</Text>
            {company.address && <Text style={s.companyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={s.companyLine}>{[company.postal_code, company.city].filter(Boolean).join(' ')}</Text>
            )}
            {company.siret && <Text style={s.companyLine}>SIRET : {company.siret}</Text>}
            {company.tva_number && <Text style={s.companyLine}>TVA : {company.tva_number}</Text>}
            {company.email && <Text style={s.companyLine}>{company.email}</Text>}
            {company.phone && <Text style={s.companyLine}>{company.phone}</Text>}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docTitle}>DEVIS</Text>
            <Text style={s.docMeta}>N° {quote.quote_number}</Text>
            <Text style={s.docMeta}>Date : {formatDateFR(quote.issued_at)}</Text>
            <Text style={s.docMeta}>Valide jusqu'au : {formatDateFR(quote.valid_until)}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={s.clientSection}>
          <Text style={s.clientLabel}>Destinataire</Text>
          <Text style={s.clientName}>{client.company_name}</Text>
          {client.contact_name && <Text style={s.clientLine}>{client.contact_name}</Text>}
          {client.address && <Text style={s.clientLine}>{client.address}</Text>}
          {(client.postal_code || client.city) && (
            <Text style={s.clientLine}>{[client.postal_code, client.city].filter(Boolean).join(' ')}</Text>
          )}
          {client.siret && <Text style={s.clientLine}>SIRET : {client.siret}</Text>}
          {client.tva_number && <Text style={s.clientLine}>TVA : {client.tva_number}</Text>}
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.colDesc]}>Description</Text>
            <Text style={[s.th, s.colQty]}>Qté</Text>
            <Text style={[s.th, s.colUnit]}>Unité</Text>
            <Text style={[s.th, s.colPU]}>P.U. HT</Text>
            <Text style={[s.th, s.colTVA]}>TVA</Text>
            <Text style={[s.th, s.colTotal]}>Total HT</Text>
          </View>
          {lines.map((line, i) => (
            <View key={i} style={s.trow}>
              <Text style={[s.td, s.colDesc]}>{line.description}</Text>
              <Text style={[s.td, s.colQty]}>{line.quantity}</Text>
              <Text style={[s.td, s.colUnit]}>{line.unit}</Text>
              <Text style={[s.td, s.colPU]}>{formatEUR(line.unit_price)}</Text>
              <Text style={[s.td, s.colTVA]}>{line.tva_rate}%</Text>
              <Text style={[s.td, s.colTotal]}>{formatEUR(line.total_ht)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsRow}>
          <View style={s.totalsBlock}>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>Total HT</Text>
              <Text style={s.totalValue}>{formatEUR(totalHT)}</Text>
            </View>
            {groups.map((g) => (
              <View key={g.rate} style={s.totalLine}>
                <Text style={s.totalLabel}>TVA {g.rate}%</Text>
                <Text style={s.totalValue}>{formatEUR(g.montantTVA)}</Text>
              </View>
            ))}
            <View style={s.totalTTCLine}>
              <Text style={s.totalTTCLabel}>Total TTC</Text>
              <Text style={s.totalTTCValue}>{formatEUR(totalTTC)}</Text>
            </View>
          </View>
        </View>

        {/* TVA Recap */}
        {groups.length > 1 && (
          <View style={s.tvaSection}>
            <Text style={s.tvaSectionTitle}>Récapitulatif TVA</Text>
            <View style={[s.tvaRow, { borderBottomWidth: 0.5, borderBottomColor: c.border, paddingBottom: 4 }]}>
              <Text style={[s.tvaCol, { fontWeight: 'bold', color: c.muted, fontSize: 7 }]}>Taux</Text>
              <Text style={[s.tvaCol, { fontWeight: 'bold', color: c.muted, fontSize: 7, textAlign: 'right' }]}>Base HT</Text>
              <Text style={[s.tvaCol, { fontWeight: 'bold', color: c.muted, fontSize: 7, textAlign: 'right' }]}>Montant TVA</Text>
              <Text style={[s.tvaCol, { fontWeight: 'bold', color: c.muted, fontSize: 7, textAlign: 'right' }]}>Total TTC</Text>
            </View>
            {groups.map((g) => (
              <View key={g.rate} style={s.tvaRow}>
                <Text style={s.tvaCol}>{g.rate === 0 ? '0% (exo)' : `${g.rate}%`}</Text>
                <Text style={[s.tvaCol, { textAlign: 'right' }]}>{formatEUR(g.baseHT)}</Text>
                <Text style={[s.tvaCol, { textAlign: 'right' }]}>{formatEUR(g.montantTVA)}</Text>
                <Text style={[s.tvaCol, { textAlign: 'right' }]}>{formatEUR(g.totalTTC)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {quote.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesTitle}>Notes</Text>
            <Text style={s.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerLine}>
            <Text style={s.footerText}>
              {company.company_name ?? 'OOHMYAD'}
              {company.siret ? ` — SIRET ${company.siret}` : ''}
              {company.tva_number ? ` — TVA ${company.tva_number}` : ''}
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
