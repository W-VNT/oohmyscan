import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { computeTotals, formatEUR, formatDateFR, formatDateLongFR, getTvaCode, type DocumentLine } from './pdf-helpers'
import { HtmlContent } from './html-to-pdf'
import { PAYMENT_TERMS_LABELS, type PaymentTerms } from '@/lib/constants'

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

// Brand colors matching client PDF
const c = {
  primary: '#0F172A',
  accent: '#B91C1C', // dark red, matching client branding
  muted: '#64748B',
  border: '#D1D5DB',
  bg: '#F3F4F6',
  lightBg: '#F9FAFB',
  green: '#16A34A',
  white: '#FFFFFF',
}

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 70, paddingHorizontal: 40, fontSize: 9, fontFamily: 'Helvetica', color: c.primary },

  // === HEADER ===
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logoBlock: { maxWidth: 260 },
  docBlock: { textAlign: 'right', paddingTop: 4 },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: c.accent },
  docNumber: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  docDate: { fontSize: 9, marginTop: 2 },

  // === CLIENT BOX ===
  clientBox: { marginLeft: 'auto', maxWidth: 280, borderWidth: 1, borderColor: c.border, padding: 12, marginBottom: 16 },
  clientLabel: { fontSize: 8, fontWeight: 'bold', color: c.accent, marginBottom: 6, textTransform: 'uppercase' },
  clientName: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  clientLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  clientSmall: { fontSize: 7, color: c.muted, lineHeight: 1.5, marginTop: 4 },

  // === DOSSIER / ORIGIN LINE ===
  dossierLine: { fontSize: 9, fontWeight: 'bold', marginBottom: 12, borderBottomWidth: 0.5, borderBottomColor: c.border, paddingBottom: 6 },

  // === INFO BOX ===
  infoBox: { borderWidth: 0.5, borderColor: c.border, padding: 8, marginBottom: 12 },
  infoLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  infoText: { fontSize: 8, color: c.muted },

  // === TABLE ===
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

  // === CONDITIONS DE PAIEMENT ===
  paymentBox: { borderWidth: 0.5, borderColor: c.border, padding: 10, marginBottom: 12 },
  paymentTitle: { fontSize: 8.5, fontWeight: 'bold', marginBottom: 6, textDecorationLine: 'underline' },
  paymentText: { fontSize: 8, lineHeight: 1.6 },
  paymentBold: { fontSize: 8, fontWeight: 'bold', lineHeight: 1.6 },
  paymentSmall: { fontSize: 7, color: c.muted, lineHeight: 1.5, marginTop: 6 },

  // === BOTTOM SECTION: bank left + totals right ===
  bottomRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  bottomLeft: { flex: 1 },
  bottomRight: { width: 240 },

  // Bank info
  bankBox: { borderWidth: 0.5, borderColor: c.border, padding: 8 },
  bankTitle: { fontSize: 8, fontWeight: 'bold', marginBottom: 4, textDecorationLine: 'underline' },
  bankRow: { flexDirection: 'row', paddingVertical: 2 },
  bankLabel: { width: 55, fontSize: 8, fontWeight: 'bold' },
  bankValue: { flex: 1, fontSize: 8 },

  // Totals
  totalsBox: { borderWidth: 0.5, borderColor: c.border },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  totalsLabel: { fontSize: 8 },
  totalsValue: { fontSize: 8, textAlign: 'right' },
  totalsBold: { fontSize: 8, fontWeight: 'bold' },
  totalsBoldValue: { fontSize: 8, fontWeight: 'bold', textAlign: 'right' },
  totalsTTCRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: c.bg, borderTopWidth: 0.5, borderTopColor: c.border },

  // TVA recap table
  tvaHeaderRow: { flexDirection: 'row', backgroundColor: c.lightBg, borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 3, paddingHorizontal: 8 },
  tvaRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 3, paddingHorizontal: 8 },
  tvaCol: { flex: 1, fontSize: 8, textAlign: 'right' },
  tvaColFirst: { flex: 1, fontSize: 8 },

  // Stamps
  paidStamp: { position: 'absolute', top: 200, right: 50, borderWidth: 3, borderColor: c.green, borderRadius: 4, paddingHorizontal: 16, paddingVertical: 8, transform: 'rotate(-15deg)', opacity: 0.7 },
  paidText: { fontSize: 24, fontWeight: 'bold', color: c.green, textTransform: 'uppercase' },
  draftWatermark: { position: 'absolute', top: 350, left: 100, transform: 'rotate(-35deg)', opacity: 0.06 },
  draftWatermarkText: { fontSize: 90, fontWeight: 'bold', color: c.primary, letterSpacing: 12 },

  // Repeat header on each page (top-right)
  pageHeader: { position: 'absolute', top: 10, right: 40 },
  pageHeaderText: { fontSize: 7, color: c.muted },

  // Footer
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40 },
  footerBg: { backgroundColor: c.accent, paddingVertical: 8, paddingHorizontal: 12 },
  footerText: { fontSize: 6.5, color: c.white, textAlign: 'center', lineHeight: 1.6 },
  pageNumber: { fontSize: 7, color: c.white, textAlign: 'right', marginTop: 2 },
})

export interface InvoicePDFProps {
  invoice: {
    invoice_number: string
    issued_at: string
    due_at: string
    paid_at: string | null
    notes: string | null
    status: string
    quote_id: string | null
    invoice_type?: 'standard' | 'acompte' | 'solde' | 'avoir'
    deposit_percentage?: number | null
    deposit_invoice_number?: string | null
    payment_terms?: PaymentTerms
    client_reference?: string | null
  }
  quoteNumber?: string | null
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
    iban: string | null
    bic: string | null
    legal_mentions: string | null
    logo_url?: string | null
    late_penalty_text?: string | null
  }
  termsHtml?: string | null
  qrCodeDataUrl?: string | null
}

export function InvoicePDF({ invoice, quoteNumber, contactName, client, lines, company, termsHtml, qrCodeDataUrl }: InvoicePDFProps) {
  const base = computeTotals(lines)
  const invoiceType = invoice.invoice_type ?? 'standard'
  const depositPct = invoice.deposit_percentage ?? 0

  const ratio = invoiceType === 'acompte' ? depositPct / 100 : 1
  const totalTTC = invoiceType === 'acompte' ? Math.round(base.totalTTC * ratio * 100) / 100 : base.totalTTC
  const groups = invoiceType === 'acompte'
    ? base.groups.map((g) => ({ ...g, baseHT: Math.round(g.baseHT * ratio * 100) / 100, montantTVA: Math.round(g.montantTVA * ratio * 100) / 100, totalTTC: Math.round(g.totalTTC * ratio * 100) / 100 }))
    : base.groups

  const docLabel = invoiceType === 'acompte'
    ? `Facture d'acompte (${depositPct}%)`
    : invoiceType === 'solde'
      ? 'Facture de solde'
      : invoiceType === 'avoir'
        ? 'Avoir'
        : 'Facture'

  // Dossier / origin line
  const dossierParts: string[] = []
  if (invoice.client_reference) dossierParts.push(`Dossier ${invoice.client_reference}`)
  if (quoteNumber) dossierParts.push(`Origine: Devis ${quoteNumber} du ${formatDateFR(invoice.issued_at)}`)
  if (invoiceType === 'solde' && invoice.deposit_invoice_number) {
    dossierParts.push(`Réf. acompte: ${invoice.deposit_invoice_number}`)
  }

  // Payment terms text
  const paymentTermsLabel = invoice.payment_terms ? PAYMENT_TERMS_LABELS[invoice.payment_terms] : ''
  const dueDateFormatted = formatDateLongFR(invoice.due_at)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* === HEADER: Logo left + Doc info right === */}
        <View style={s.headerRow}>
          <View style={s.logoBlock}>
            {company.logo_url && (
              <Image src={company.logo_url} style={{ width: 180, height: 60, objectFit: 'contain' }} />
            )}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docTitle}>{docLabel}</Text>
            <Text style={s.docNumber}>{invoice.invoice_number}</Text>
            <Text style={s.docDate}>{formatDateFR(invoice.issued_at)}</Text>
          </View>
        </View>

        {/* === CLIENT BOX (right aligned) === */}
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

        {/* === DOSSIER / ORIGIN LINE === */}
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

        {/* === STAMPS === */}
        {invoice.status === 'draft' && (
          <View style={s.draftWatermark}>
            <Text style={s.draftWatermarkText}>BROUILLON</Text>
          </View>
        )}
        {invoice.status === 'paid' && (
          <View style={s.paidStamp}>
            <Text style={s.paidText}>Payée</Text>
            {invoice.paid_at && (
              <Text style={{ fontSize: 8, color: c.green, textAlign: 'center' }}>{formatDateFR(invoice.paid_at)}</Text>
            )}
          </View>
        )}

        {/* === LINE ITEMS TABLE === */}
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
              <Text style={[s.td, s.colDesc]}>{line.description}</Text>
              <Text style={[s.td, s.colPU]}>{formatEUR(line.unit_price)}</Text>
              <Text style={[s.td, s.colQty]}>{line.quantity}</Text>
              <Text style={[s.td, s.colDiscount]}>
                {line.discount_value && line.discount_type
                  ? `${line.discount_value}${line.discount_type === 'percent' ? '%' : '€'}`
                  : '—'}
              </Text>
              <Text style={[s.td, s.colTotal]}>{formatEUR(line.total_ht)}</Text>
              <Text style={[s.td, s.colTVA]}>{line.tva_rate}% {getTvaCode(line.tva_rate, groups)}</Text>
            </View>
          ))}
        </View>

        {/* === CONDITIONS DE PAIEMENT === */}
        <View style={s.paymentBox}>
          <Text style={s.paymentTitle}>Conditions de paiement</Text>
          <Text style={s.paymentBold}>
            Échéance : {formatEUR(totalTTC)} € {paymentTermsLabel ? paymentTermsLabel.toLowerCase().replace('paiement ', '') : ''} (le {dueDateFormatted}) par virement
          </Text>
          {company.late_penalty_text && (
            <Text style={s.paymentSmall}>
              Modalités: {company.late_penalty_text}
            </Text>
          )}
        </View>

        {/* === BOTTOM: Bank left + Totals/TVA right === */}
        <View style={s.bottomRow}>
          {/* Bank info */}
          <View style={s.bottomLeft}>
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
                {qrCodeDataUrl && (
                  <View style={{ marginTop: 8, alignItems: 'center' }}>
                    <Image src={qrCodeDataUrl} style={{ width: 80, height: 80 }} />
                    <Text style={{ fontSize: 6, color: c.muted, marginTop: 2 }}>Scanner pour payer</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Totals + TVA recap */}
          <View style={s.bottomRight}>
            <View style={s.totalsBox}>
              {/* Total lignes HT */}
              <View style={[s.totalsRow, { borderBottomWidth: 0.5, borderBottomColor: c.border }]}>
                <Text style={s.totalsBold}>Montant total lignes HT</Text>
                <Text style={s.totalsBoldValue}>{formatEUR(base.totalHT)} €</Text>
              </View>

              {/* TVA recap */}
              <View style={s.tvaHeaderRow}>
                <Text style={[s.tvaColFirst, { fontSize: 7, fontWeight: 'bold' }]}>Code TVA</Text>
                <Text style={[s.tvaCol, { fontSize: 7, fontWeight: 'bold' }]}>%</Text>
                <Text style={[s.tvaCol, { fontSize: 7, fontWeight: 'bold' }]}>TTC €</Text>
                <Text style={[s.tvaCol, { fontSize: 7, fontWeight: 'bold' }]}>HT €</Text>
                <Text style={[s.tvaCol, { fontSize: 7, fontWeight: 'bold' }]}>TVA €</Text>
              </View>
              {groups.map((g) => (
                <View key={g.rate} style={s.tvaRow}>
                  <Text style={s.tvaColFirst}>{g.code}</Text>
                  <Text style={s.tvaCol}>{g.rate}</Text>
                  <Text style={s.tvaCol}>{formatEUR(g.totalTTC)}</Text>
                  <Text style={s.tvaCol}>{formatEUR(g.baseHT)}</Text>
                  <Text style={s.tvaCol}>{formatEUR(g.montantTVA)}</Text>
                </View>
              ))}

              {/* Total TTC */}
              <View style={s.totalsTTCRow}>
                <Text style={s.totalsBold}>Montant total TTC</Text>
                <Text style={s.totalsBoldValue}>{formatEUR(totalTTC)} €</Text>
              </View>

              {/* Reste à payer */}
              <View style={[s.totalsRow, { borderTopWidth: 0.5, borderTopColor: c.border }]}>
                <Text style={s.totalsBold}>Reste à payer</Text>
                <Text style={s.totalsBoldValue}>
                  {invoice.status === 'paid' ? '0,00 €' : `${formatEUR(totalTTC)} €`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* === NOTES === */}
        {invoice.notes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 3 }}>Notes</Text>
            <Text style={{ fontSize: 8, color: c.muted, lineHeight: 1.5 }}>{invoice.notes}</Text>
          </View>
        )}

        {/* === FOOTER (fixed on every page) === */}
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
