import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { computeTotals, formatEUR, formatDateFR, type DocumentLine } from './pdf-helpers'
import { HtmlContent, renderHtmlInline } from './html-to-pdf'

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

const c = {
  primary: '#0F172A',
  accent: '#B91C1C',
  muted: '#64748B',
  border: '#D1D5DB',
  bg: '#F3F4F6',
  lightBg: '#F9FAFB',
  white: '#FFFFFF',
}

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 70, paddingHorizontal: 40, fontSize: 9, fontFamily: 'Helvetica', color: c.primary },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logoBlock: { maxWidth: 260 },
  docBlock: { textAlign: 'right', paddingTop: 4 },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: c.accent },
  docNumber: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  docDate: { fontSize: 9, marginTop: 2 },

  clientBox: { marginLeft: 'auto', maxWidth: 280, borderWidth: 1, borderColor: c.border, padding: 12, marginBottom: 16 },
  clientLabel: { fontSize: 8, fontWeight: 'bold', color: c.accent, marginBottom: 6, textTransform: 'uppercase' },
  clientName: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  clientLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  clientSmall: { fontSize: 7, color: c.muted, lineHeight: 1.5, marginTop: 4 },

  dossierLine: { fontSize: 9, fontWeight: 'bold', marginBottom: 12, borderBottomWidth: 0.5, borderBottomColor: c.border, paddingBottom: 6 },

  infoBox: { borderWidth: 0.5, borderColor: c.border, padding: 8, marginBottom: 12 },
  infoLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  infoText: { fontSize: 8, color: c.muted },

  table: { marginBottom: 12 },
  thead: { flexDirection: 'row', backgroundColor: c.accent, paddingVertical: 5, paddingHorizontal: 4 },
  th: { fontSize: 7.5, fontWeight: 'bold', color: c.white },
  trow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 5, paddingHorizontal: 4, minHeight: 20 },
  td: { fontSize: 8.5 },
  colDesc: { flex: 1, paddingRight: 6 },
  colPU: { width: 55, textAlign: 'right' },
  colQty: { width: 30, textAlign: 'center' },
  colDiscount: { width: 45, textAlign: 'center' },
  colTotal: { width: 60, textAlign: 'right' },
  colTVA: { width: 40, textAlign: 'center' },

  paymentBox: { borderWidth: 0.5, borderColor: c.border, padding: 10, marginBottom: 12 },
  paymentTitle: { fontSize: 8.5, fontWeight: 'bold', marginBottom: 6, textDecorationLine: 'underline' },
  paymentBold: { fontSize: 8, fontWeight: 'bold', lineHeight: 1.6 },
  paymentSmall: { fontSize: 7, color: c.muted, lineHeight: 1.5, marginTop: 6 },

  bottomRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  bottomLeft: { flex: 1 },
  bottomRight: { width: 240 },

  // Accord client box
  accordBox: { borderWidth: 0.5, borderColor: c.border, padding: 10 },
  accordTitle: { fontSize: 8, fontWeight: 'bold', marginBottom: 4 },
  accordText: { fontSize: 8, color: c.muted, lineHeight: 1.6 },
  signatureArea: { height: 50, marginTop: 8, borderBottomWidth: 0.5, borderBottomColor: c.border },

  // Bank info
  bankBox: { borderWidth: 0.5, borderColor: c.border, padding: 8, marginTop: 8 },
  bankTitle: { fontSize: 8, fontWeight: 'bold', marginBottom: 4, textDecorationLine: 'underline' },
  bankRow: { flexDirection: 'row', paddingVertical: 2 },
  bankLabel: { width: 55, fontSize: 8, fontWeight: 'bold' },
  bankValue: { flex: 1, fontSize: 8 },

  // Totals
  totalsBox: { borderWidth: 0.5, borderColor: c.border },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  totalsBold: { fontSize: 8, fontWeight: 'bold' },
  totalsBoldValue: { fontSize: 8, fontWeight: 'bold', textAlign: 'right' },
  totalsTTCRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: c.bg, borderTopWidth: 0.5, borderTopColor: c.border },

  tvaHeaderRow: { flexDirection: 'row', backgroundColor: c.lightBg, borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 3, paddingHorizontal: 8 },
  tvaRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 3, paddingHorizontal: 8 },
  tvaCol: { flex: 1, fontSize: 8, textAlign: 'right' },
  tvaColFirst: { flex: 1, fontSize: 8 },


  footer: { position: 'absolute', bottom: 20, left: 40, right: 40 },
  footerBg: { backgroundColor: c.accent, paddingVertical: 8, paddingHorizontal: 12 },
  footerText: { fontSize: 6.5, color: c.white, textAlign: 'center', lineHeight: 1.6 },
  pageNumber: { fontSize: 7, color: c.white, textAlign: 'right', marginTop: 2 },
})

export interface QuotePDFProps {
  quote: {
    quote_number: string
    issued_at: string
    valid_until: string
    notes: string | null
    status: string
    client_reference?: string | null
  }
  contactName?: string | null
  client: {
    company_name: string
    contact_name: string | null
    address: string | null
    city: string | null
    postal_code: string | null
    siret: string | null
    tva_number: string | null
    email: string | null
    phone: string | null
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
    logo_url?: string | null
    late_penalty_text?: string | null
    iban: string | null
    bic: string | null
  }
  termsHtml?: string | null
}

export function QuotePDF({ quote, contactName, client, lines, company, termsHtml }: QuotePDFProps) {
  const { totalHT, totalTTC, groups } = computeTotals(lines)

  const dossierParts: string[] = []
  if (quote.client_reference) dossierParts.push(`Dossier ${quote.client_reference}`)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* === HEADER === */}
        <View style={s.headerRow}>
          <View style={s.logoBlock}>
            {company.logo_url && (
              <Image src={company.logo_url} style={{ width: 180, height: 60, objectFit: 'contain' }} />
            )}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docTitle}>Devis</Text>
            <Text style={s.docNumber}>{quote.quote_number}</Text>
            <Text style={s.docDate}>{formatDateFR(quote.issued_at)}</Text>
          </View>
        </View>

        {/* === CLIENT BOX === */}
        <View style={s.clientBox}>
          <Text style={s.clientLabel}>Adresse de facturation</Text>
          <Text style={s.clientName}>{client.company_name}</Text>
          {client.contact_name && <Text style={s.clientLine}>{client.contact_name}</Text>}
          {client.address && <Text style={s.clientLine}>{client.address}</Text>}
          {(client.postal_code || client.city) && (
            <Text style={s.clientLine}>{[client.postal_code, client.city].filter(Boolean).join(' ')}</Text>
          )}
          {client.phone && <Text style={s.clientLine}>Tél {client.phone}</Text>}
          {client.email && <Text style={s.clientLine}>{client.email}</Text>}
          {(client.siret || client.tva_number) && (
            <Text style={s.clientSmall}>
              {[
                client.tva_number ? `TVA Intra ${client.tva_number}` : null,
                client.siret ? `SIREN ${client.siret}` : null,
              ].filter(Boolean).join(' - ')}
            </Text>
          )}
        </View>

        {/* === DOSSIER LINE === */}
        {dossierParts.length > 0 && (
          <Text style={s.dossierLine}>{dossierParts.join(' - ')}</Text>
        )}

        {/* === CONTACT INFO === */}
        {contactName && (
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Informations</Text>
            <Text style={s.infoText}>Votre contact : {contactName}</Text>
          </View>
        )}


        {/* === TABLE === */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.colDesc]}>Désignation</Text>
            <Text style={[s.th, s.colPU]}>Prix unit{'\n'}€ HT</Text>
            <Text style={[s.th, s.colQty]}>Qté</Text>
            <Text style={[s.th, s.colDiscount]}>Remise</Text>
            <Text style={[s.th, s.colTotal]}>Prix total{'\n'}€ HT</Text>
            <Text style={[s.th, s.colTVA]}>TVA</Text>
          </View>
          {lines.map((line, i) => (
            <View key={i} style={s.trow} wrap={false}>
              <Text style={[s.td, s.colDesc]}>{renderHtmlInline(line.description)}</Text>
              <Text style={[s.td, s.colPU]}>{formatEUR(line.unit_price)}</Text>
              <Text style={[s.td, s.colQty]}>{line.quantity}</Text>
              <Text style={[s.td, s.colDiscount]}>
                {line.discount_value && line.discount_type
                  ? `${line.discount_value}${line.discount_type === 'percent' ? '%' : '€'}`
                  : '—'}
              </Text>
              <Text style={[s.td, s.colTotal]}>{formatEUR(line.total_ht)}</Text>
              <Text style={[s.td, s.colTVA]}>{line.tva_rate}%</Text>
            </View>
          ))}
        </View>

        {/* === CONDITIONS DE PAIEMENT === */}
        <View style={s.paymentBox}>
          <Text style={s.paymentTitle}>Conditions de paiement</Text>
          <Text style={s.paymentBold}>
            Échéance : {formatEUR(totalTTC)} € par virement
          </Text>
          {company.late_penalty_text && (
            <Text style={s.paymentSmall}>
              Modalités: {company.late_penalty_text}
            </Text>
          )}
        </View>

        {/* === BOTTOM: Accord left + Totals right === */}
        <View style={s.bottomRow}>
          {/* Accord client */}
          <View style={s.bottomLeft}>
            <View style={s.accordBox}>
              <Text style={s.accordTitle}>
                Accord client - Proposition expirant le {formatDateFR(quote.valid_until)}
              </Text>
              <Text style={s.accordText}>
                Mention 'Bon pour accord', date, et signature
              </Text>
              <View style={s.signatureArea} />
            </View>
            {(company.iban || company.bic) && (
              <View style={s.bankBox}>
                <Text style={s.bankTitle}>Coordonnées bancaires</Text>
                <View style={s.bankRow}>
                  <Text style={s.bankLabel}>BIC</Text>
                  <Text style={s.bankValue}>{company.bic ?? '—'}</Text>
                </View>
                <View style={s.bankRow}>
                  <Text style={s.bankLabel}>IBAN</Text>
                  <Text style={s.bankValue}>{company.iban ?? '—'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Totals + TVA */}
          <View style={s.bottomRight}>
            <View style={s.totalsBox}>
              <View style={[s.totalsRow, { borderBottomWidth: 0.5, borderBottomColor: c.border }]}>
                <Text style={s.totalsBold}>Montant total lignes HT</Text>
                <Text style={s.totalsBoldValue}>{formatEUR(totalHT)} €</Text>
              </View>

              <View style={s.tvaHeaderRow}>
                <Text style={[s.tvaColFirst, { fontSize: 7, fontWeight: 'bold' }]}>Taux</Text>
                <Text style={[s.tvaCol, { fontSize: 7, fontWeight: 'bold' }]}>HT €</Text>
                <Text style={[s.tvaCol, { fontSize: 7, fontWeight: 'bold' }]}>TVA €</Text>
                <Text style={[s.tvaCol, { fontSize: 7, fontWeight: 'bold' }]}>TTC €</Text>
              </View>
              {groups.map((g) => (
                <View key={g.rate} style={s.tvaRow}>
                  <Text style={s.tvaColFirst}>{g.rate}%</Text>
                  <Text style={s.tvaCol}>{formatEUR(g.baseHT)}</Text>
                  <Text style={s.tvaCol}>{formatEUR(g.montantTVA)}</Text>
                  <Text style={s.tvaCol}>{formatEUR(g.totalTTC)}</Text>
                </View>
              ))}

              <View style={s.totalsTTCRow}>
                <Text style={s.totalsBold}>Montant total TTC</Text>
                <Text style={s.totalsBoldValue}>{formatEUR(totalTTC)} €</Text>
              </View>
            </View>
          </View>
        </View>

        {/* === NOTES === */}
        {quote.notes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 3 }}>Notes</Text>
            <Text style={{ fontSize: 8, color: c.muted, lineHeight: 1.5 }}>{quote.notes}</Text>
          </View>
        )}

        {/* === FOOTER === */}
        <View style={s.footer} fixed>
          <View style={s.footerBg}>
            <Text style={s.footerText}>
              {company.company_name ?? 'OOHMYAD'}
              {company.email ? ` - ${company.email}` : ''}
            </Text>
            <Text style={s.footerText}>
              {[company.address, company.postal_code, company.city].filter(Boolean).join(' ')}
              {company.phone ? ` - tél ${company.phone}` : ''}
            </Text>
            <Text style={s.footerText}>
              {[
                company.siret ? `SIREN ${company.siret}` : null,
                company.tva_number ? `TVA Intra ${company.tva_number}` : null,
              ].filter(Boolean).join(' - ')}
            </Text>
            {company.legal_mentions && (
              <Text style={s.footerText}>{company.legal_mentions}</Text>
            )}
            <Text
              style={s.pageNumber}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`}
            />
          </View>
        </View>
      </Page>

      {/* CGV Page */}
      {termsHtml && (
        <Page size="A4" style={s.page}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
              {company.company_name ?? 'OOHMYAD'}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' }}>
              Conditions Générales de Ventes
            </Text>
          </View>
          <HtmlContent html={termsHtml} />
          <View style={s.footer} fixed>
            <View style={s.footerBg}>
              <Text style={s.footerText}>
                {company.company_name ?? 'OOHMYAD'}
                {company.email ? ` - ${company.email}` : ''}
              </Text>
              <Text
                style={s.pageNumber}
                render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`}
              />
            </View>
          </View>
        </Page>
      )}
    </Document>
  )
}
