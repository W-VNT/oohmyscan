import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatDateFR } from './pdf-helpers'

const c = {
  primary: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  accent: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: c.primary },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyBlock: { maxWidth: 240 },
  companyName: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  companyLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  docBlock: { textAlign: 'right' },
  docMeta: { fontSize: 8, color: c.muted, lineHeight: 1.6 },
  // Title
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: c.accent },
  subtitle: { fontSize: 9, textAlign: 'center', color: c.muted, marginBottom: 20 },
  // Articles
  articleTitle: { fontSize: 9, fontWeight: 'bold', color: c.accent, marginBottom: 4, marginTop: 14 },
  bodyText: { fontSize: 8, color: c.primary, lineHeight: 1.7, marginBottom: 4 },
  bulletText: { fontSize: 8, color: c.primary, lineHeight: 1.7, marginBottom: 2, paddingLeft: 12 },
  // Change boxes
  changeBox: { backgroundColor: '#F0FDF4', borderRadius: 4, padding: 8, marginBottom: 6, marginTop: 4 },
  changeBoxRemoved: { backgroundColor: '#FEF2F2', borderRadius: 4, padding: 8, marginBottom: 6, marginTop: 4 },
  changeLabel: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  changeLabelAdded: { color: c.green },
  changeLabelRemoved: { color: c.red },
  changeLine: { fontSize: 8.5, marginBottom: 2 },
  // Highlight
  highlightBox: { backgroundColor: c.bg, borderRadius: 4, padding: 8, marginBottom: 6, marginTop: 4 },
  highlightText: { fontSize: 8.5, fontWeight: 'bold', color: c.primary },
  // Table
  table: { marginBottom: 10, marginTop: 4 },
  thead: { flexDirection: 'row', backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 5 },
  th: { fontSize: 7, fontWeight: 'bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  trow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 5 },
  trowNew: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: c.border, paddingVertical: 5, backgroundColor: '#F0FDF4' },
  td: { fontSize: 8.5 },
  colZone: { flex: 1, paddingLeft: 8 },
  colRef: { width: 120, textAlign: 'center' },
  colStatus: { width: 80, textAlign: 'right', paddingRight: 8 },
  newBadge: { fontSize: 7, color: c.green, fontWeight: 'bold' },
  // Signatures
  signatureRow: { flexDirection: 'row', gap: 40, marginTop: 16 },
  signatureBox: { flex: 1 },
  signatureLabel: { fontSize: 8, fontWeight: 'bold', color: c.muted, marginBottom: 4 },
  signatureName: { fontSize: 8, color: c.muted, marginBottom: 6 },
  signatureImage: { width: 160, height: 50, objectFit: 'contain' },
  dateLine: { fontSize: 8, color: c.muted, marginBottom: 8, marginTop: 14 },
  partyLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerLine: { borderTopWidth: 0.5, borderTopColor: c.border, paddingTop: 8 },
  footerText: { fontSize: 7, color: c.muted, textAlign: 'center', lineHeight: 1.5 },
})

interface PanelSnapshot {
  panel_id: string
  zone_label: string
  qr_code: string
  reference: string
}

export interface AmendmentPDFProps {
  amendmentNumber: string
  originalContractNumber: string
  originalSignedAt: string
  signedAt: string
  signedCity: string | null
  reason: 'panel_added' | 'panel_removed' | 'terms_updated'
  establishment: {
    name: string
    address: string
    postal_code: string
    city: string
  }
  owner: {
    first_name: string
    last_name: string
    role: string
  }
  panelsAdded: PanelSnapshot[]
  panelsRemoved: PanelSnapshot[]
  panelsAfter: PanelSnapshot[]
  signatureOwner: string
  signatureOperator: string
  company: {
    name: string
    address: string | null
    city: string | null
    postal_code: string | null
    siret: string | null
    logoUrl: string | null
  }
  zoneLabels: Record<string, string>
}

const REASON_LABELS: Record<string, string> = {
  panel_added: 'Ajout de support(s) publicitaire(s)',
  panel_removed: 'Retrait de support(s) publicitaire(s)',
  terms_updated: 'Modification des termes',
}

export function AmendmentPDF({
  amendmentNumber,
  originalContractNumber,
  originalSignedAt,
  signedAt,
  signedCity,
  reason,
  establishment,
  owner,
  panelsAdded,
  panelsRemoved,
  panelsAfter,
  signatureOwner,
  signatureOperator,
  company,
  zoneLabels,
}: AmendmentPDFProps) {
  const addedIds = new Set(panelsAdded.map((p) => p.panel_id))
  const pointsTotal = panelsAfter.length * 50

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.companyBlock}>
            {company.logoUrl && (
              <Image src={company.logoUrl} style={{ width: 100, marginBottom: 6 }} />
            )}
            <Text style={s.companyName}>{company.name}</Text>
            {company.address && <Text style={s.companyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={s.companyLine}>{[company.postal_code, company.city].filter(Boolean).join(' ')}</Text>
            )}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docMeta}>Avenant N° {amendmentNumber}</Text>
            <Text style={s.docMeta}>Contrat : {originalContractNumber}</Text>
            <Text style={s.docMeta}>Date : {formatDateFR(signedAt)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>Avenant à l'autorisation d'installation de supports publicitaires</Text>
        <Text style={s.subtitle}>
          Contrat {originalContractNumber} du {formatDateFR(originalSignedAt)}
        </Text>

        {/* Article 1 — Parties */}
        <Text style={s.articleTitle}>1. Parties</Text>
        <Text style={s.bodyText}>
          Entre {company.name}{company.address ? `, ${company.address}` : ''}{company.postal_code || company.city ? ` – ${[company.postal_code, company.city].filter(Boolean).join(' ')}` : ''},
        </Text>
        <Text style={s.bodyText}>
          Et l'établissement « {establishment.name} », {establishment.address}, {establishment.postal_code} {establishment.city}, représenté par {owner.first_name} {owner.last_name} ({owner.role}).
        </Text>

        {/* Article 2 — Objet */}
        <Text style={s.articleTitle}>2. Objet de l'avenant</Text>
        <Text style={s.bodyText}>
          {REASON_LABELS[reason] ?? reason}. Les parties conviennent de modifier l'autorisation initiale comme suit :
        </Text>

        {/* Panels added */}
        {panelsAdded.length > 0 && (
          <View style={s.changeBox}>
            <Text style={[s.changeLabel, s.changeLabelAdded]}>
              Support{panelsAdded.length > 1 ? 's' : ''} ajouté{panelsAdded.length > 1 ? 's' : ''} ({panelsAdded.length})
            </Text>
            {panelsAdded.map((p, i) => (
              <Text key={i} style={s.changeLine}>
                → Zone : {zoneLabels[p.zone_label] ?? p.zone_label} — Réf : {p.reference}
              </Text>
            ))}
          </View>
        )}

        {/* Panels removed */}
        {panelsRemoved.length > 0 && (
          <View style={s.changeBoxRemoved}>
            <Text style={[s.changeLabel, s.changeLabelRemoved]}>
              Support{panelsRemoved.length > 1 ? 's' : ''} retiré{panelsRemoved.length > 1 ? 's' : ''} ({panelsRemoved.length})
            </Text>
            {panelsRemoved.map((p, i) => (
              <Text key={i} style={s.changeLine}>
                → Zone : {zoneLabels[p.zone_label] ?? p.zone_label} — Réf : {p.reference}
              </Text>
            ))}
          </View>
        )}

        {/* Article 3 — Situation après avenant */}
        <Text style={s.articleTitle}>3. Supports après avenant</Text>
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.colZone]}>Zone</Text>
            <Text style={[s.th, s.colRef]}>Référence</Text>
            <Text style={[s.th, s.colStatus]}></Text>
          </View>
          {panelsAfter.map((p, i) => (
            <View key={i} style={addedIds.has(p.panel_id) ? s.trowNew : s.trow}>
              <Text style={[s.td, s.colZone]}>{zoneLabels[p.zone_label] ?? p.zone_label}</Text>
              <Text style={[s.td, s.colRef]}>{p.reference}</Text>
              <Text style={[s.td, s.colStatus]}>
                {addedIds.has(p.panel_id) ? <Text style={s.newBadge}>NOUVEAU</Text> : null}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.highlightBox}>
          <Text style={s.highlightText}>
            Total : {panelsAfter.length} support{panelsAfter.length !== 1 ? 's' : ''} — Format : 40 × 60 cm
          </Text>
        </View>

        {/* Article 4 — Avantage partenaire mis à jour */}
        <Text style={s.articleTitle}>4. Avantage partenaire mis à jour</Text>
        <Text style={s.bodyText}>
          Suite à cet avenant, la dotation est recalculée sur la base du nouveau nombre de supports :
        </Text>
        <View style={s.highlightBox}>
          <Text style={s.highlightText}>
            50 points × {panelsAfter.length} support{panelsAfter.length !== 1 ? 's' : ''} = {pointsTotal} points ({pointsTotal} €)
          </Text>
        </View>

        {/* Article 5 — Dispositions inchangées */}
        <Text style={s.articleTitle}>5. Dispositions inchangées</Text>
        <Text style={s.bodyText}>
          Toutes les autres clauses de l'autorisation initiale {originalContractNumber} restent inchangées et en vigueur.
        </Text>

        {/* Article 6 — Validation */}
        <Text style={s.articleTitle}>6. Validation</Text>
        <Text style={s.bodyText}>
          La signature du présent avenant vaut accord des deux parties sur les modifications décrites ci-dessus.
        </Text>

        {/* Signatures */}
        <Text style={s.dateLine}>
          Fait à {signedCity ?? establishment.city}, le {formatDateFR(signedAt)}
        </Text>

        <View style={s.signatureRow}>
          <View style={s.signatureBox}>
            <Text style={s.signatureLabel}>L'établissement partenaire</Text>
            <Text style={s.signatureName}>{owner.first_name} {owner.last_name}</Text>
            {signatureOwner && <Image src={signatureOwner} style={s.signatureImage} />}
          </View>
          <View style={s.signatureBox}>
            <Text style={s.signatureLabel}>Pour {company.name}</Text>
            {signatureOperator && <Image src={signatureOperator} style={s.signatureImage} />}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerLine}>
            <Text style={s.footerText}>
              Contrat : {originalContractNumber} — Avenant : {amendmentNumber} — Signé électroniquement — eIDAS UE 910/2014
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
