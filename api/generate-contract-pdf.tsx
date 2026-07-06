/**
 * Vercel Serverless Function — genération PDF contrat / avenant côté serveur.
 *
 * VERSION INLINE : tout le code (templates ContractPDF + AmendmentPDF + helpers)
 * est intégré dans ce fichier unique. Raison : Vercel n'incluait pas les
 * fichiers imports depuis /api/pdf/ dans le bundle de la fonction (que ce
 * soit par static ou dynamic import, avec ou sans includeFiles). Un seul
 * fichier = zéro dépendance cross-fichier à tracer.
 *
 * Env vars Vercel requis :
 *   - VITE_SUPABASE_URL           (deja utilise en front)
 *   - SUPABASE_SERVICE_ROLE_KEY   (a ajouter)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// pdf-helpers (inline)
// ============================================================================
function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ============================================================================
// ContractPDF (inline)
// ============================================================================
const cContract = {
  primary: '#0A0A0A',
  muted: '#737373',
  border: '#E5E5E5',
  bg: '#FAFAFA',
  accent: '#F5C400',
}

const sContract = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: cContract.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: cContract.primary },
  companyBlock: { maxWidth: 240 },
  companyName: { fontSize: 13, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5 },
  companyLine: { fontSize: 8, color: cContract.muted, lineHeight: 1.5 },
  docBlock: { textAlign: 'right' },
  docMeta: { fontSize: 8, color: cContract.muted, lineHeight: 1.6 },
  titleWrap: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: cContract.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
  titleAccent: { width: 36, height: 3, backgroundColor: cContract.accent, marginTop: 8 },
  subtitle: { fontSize: 9, textAlign: 'center', color: cContract.muted, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1.5 },
  partiesRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  partyBox: { flex: 1, backgroundColor: cContract.bg, borderRadius: 4, padding: 12, borderLeftWidth: 3, borderLeftColor: cContract.accent },
  partyLabel: { fontSize: 7, fontWeight: 'bold', color: cContract.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  partyName: { fontSize: 10, fontWeight: 'bold', marginBottom: 2, color: cContract.primary },
  partyLine: { fontSize: 8, color: cContract.muted, lineHeight: 1.5 },
  articleTitle: { fontSize: 10, fontWeight: 'bold', color: cContract.primary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  bodyText: { fontSize: 8, color: cContract.primary, lineHeight: 1.7, marginBottom: 4 },
  bulletText: { fontSize: 8, color: cContract.primary, lineHeight: 1.7, marginBottom: 2, paddingLeft: 12 },
  highlightBox: { backgroundColor: cContract.bg, borderRadius: 4, padding: 10, marginBottom: 6, marginTop: 6, borderLeftWidth: 3, borderLeftColor: cContract.accent },
  highlightText: { fontSize: 9, fontWeight: 'bold', color: cContract.primary },
  highlightSubtext: { fontSize: 8, color: cContract.primary, marginTop: 3 },
  signatureRow: { flexDirection: 'row', gap: 40, marginTop: 24 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: cContract.primary, paddingTop: 8 },
  signatureLabel: { fontSize: 8, fontWeight: 'bold', color: cContract.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  signatureName: { fontSize: 8, color: cContract.muted, marginBottom: 6 },
  signatureImage: { width: 160, height: 50, objectFit: 'contain' },
  dateLine: { fontSize: 8, color: cContract.muted, marginBottom: 8, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerLine: { borderTopWidth: 0.5, borderTopColor: cContract.border, paddingTop: 8 },
  footerText: { fontSize: 7, color: cContract.muted, textAlign: 'center', lineHeight: 1.5 },
})

interface PanelSnapshot {
  panel_id: string
  zone_label: string
  qr_code: string
  reference: string
}

export interface ContractPDFProps {
  contractNumber: string
  signedAt: string
  signedCity: string | null
  establishment: { name: string; address: string; postal_code: string; city: string; phone: string | null }
  owner: { first_name: string; last_name: string; role: string; email: string | null }
  closingMonths: string | null
  panels: PanelSnapshot[]
  panelFormat?: { name: string; width_cm: number | null; height_cm: number | null } | null
  signatureOwner: string
  signatureOperator: string
  company: { name: string; address: string | null; city: string | null; postal_code: string | null; siret: string | null; phone: string | null; email: string | null; logoUrl: string | null }
  zoneLabels: Record<string, string>
}

function ContractPDF({
  contractNumber, signedAt, signedCity, establishment, owner, panels, panelFormat,
  signatureOwner, signatureOperator, company,
}: ContractPDFProps) {
  const pointsTotal = panels.length * 50
  const formatLine = panelFormat
    ? panelFormat.width_cm && panelFormat.height_cm
      ? `${panelFormat.name} — ${panelFormat.width_cm} × ${panelFormat.height_cm} cm`
      : panelFormat.name
    : 'Selon spécifications techniques convenues'

  return (
    <Document>
      <Page size="A4" style={sContract.page}>
        <View style={sContract.headerRow}>
          <View style={sContract.companyBlock}>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={{ width: 130, marginBottom: 6 }} />
            ) : (
              <Text style={sContract.companyName}>{company.name}</Text>
            )}
            {company.address && <Text style={sContract.companyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={sContract.companyLine}>{[company.postal_code, company.city].filter(Boolean).join(' ')}</Text>
            )}
          </View>
          <View style={sContract.docBlock}>
            <Text style={sContract.docMeta}>N° {contractNumber}</Text>
            <Text style={sContract.docMeta}>Date : {formatDateFR(signedAt)}</Text>
          </View>
        </View>

        <View style={sContract.titleWrap}>
          <Text style={sContract.title}>Autorisation d'installation</Text>
          <View style={sContract.titleAccent} />
        </View>

        <Text style={sContract.subtitle}>Entre</Text>

        <View style={sContract.partiesRow}>
          <View style={sContract.partyBox}>
            <Text style={sContract.partyLabel}>L'entreprise</Text>
            <Text style={sContract.partyName}>{company.name}</Text>
            {company.address && <Text style={sContract.partyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={sContract.partyLine}>{[company.postal_code, company.city].filter(Boolean).join(' ')}</Text>
            )}
          </View>
          <View style={sContract.partyBox}>
            <Text style={sContract.partyLabel}>L'établissement partenaire</Text>
            <Text style={sContract.partyName}>{establishment.name}</Text>
            <Text style={sContract.partyLine}>{establishment.address}</Text>
            <Text style={sContract.partyLine}>{establishment.postal_code} {establishment.city}</Text>
            {establishment.phone && <Text style={sContract.partyLine}>Tél : {establishment.phone}</Text>}
            <Text style={[sContract.partyLine, { marginTop: 4 }]}>Représentant : {owner.first_name} {owner.last_name} ({owner.role})</Text>
            {owner.email && <Text style={sContract.partyLine}>Email : {owner.email}</Text>}
          </View>
        </View>

        <Text style={sContract.articleTitle}>1. Objet</Text>
        <Text style={sContract.bodyText}>L'établissement autorise {company.name} à installer un ou plusieurs supports publicitaires au sein de son établissement.</Text>
        <Text style={sContract.bodyText}>Ces supports permettent la diffusion de campagnes publicitaires renouvelées périodiquement par les équipes de {company.name}.</Text>

        <Text style={sContract.articleTitle}>2. Durée</Text>
        <Text style={sContract.bodyText}>L'autorisation est accordée pour la période estivale :</Text>
        <View style={sContract.highlightBox}>
          <Text style={sContract.highlightText}>du 1er juin au 30 septembre</Text>
        </View>
        <Text style={sContract.bodyText}>Les supports restent installés durant cette période et les affiches peuvent être renouvelées ponctuellement par nos équipes.</Text>

        <Text style={sContract.articleTitle}>3. Identification et suivi</Text>
        <Text style={sContract.bodyText}>Chaque support installé est identifié par un QR code unique permettant :</Text>
        <Text style={sContract.bulletText}>• la validation de l'installation</Text>
        <Text style={sContract.bulletText}>• le suivi des campagnes publicitaires</Text>
        <Text style={sContract.bulletText}>• la traçabilité des interventions effectuées par les équipes</Text>

        <Text style={sContract.articleTitle}>4. Nombre de supports</Text>
        <View style={sContract.highlightBox}>
          <Text style={sContract.highlightText}>Nombre de supports installés : {panels.length}</Text>
          <Text style={sContract.highlightSubtext}>Format : {formatLine}</Text>
        </View>

        <Text style={sContract.articleTitle} break>5. Avantage partenaire</Text>
        <Text style={sContract.bodyText}>En contrepartie de l'autorisation d'installation des supports, l'établissement bénéficie d'une dotation en points cadeaux.</Text>
        <Text style={sContract.bodyText}>Chaque support installé ouvre droit à :</Text>
        <View style={sContract.highlightBox}>
          <Text style={sContract.highlightText}>50 points cadeaux (valeur 50 €) × {panels.length} support{panels.length !== 1 ? 's' : ''} = {pointsTotal} points ({pointsTotal} €)</Text>
        </View>
        <Text style={sContract.bodyText}>Les points sont attribués à la fin de la période d'exploitation et sont convertibles sur la plateforme partenaire ACAD, donnant accès à une sélection de produits parmi plus de 500 références.</Text>

        <Text style={sContract.articleTitle}>6. Engagements</Text>
        <Text style={sContract.bodyText}>L'établissement s'engage à :</Text>
        <Text style={sContract.bulletText}>• maintenir les supports installés pendant la durée de l'autorisation</Text>
        <Text style={sContract.bulletText}>• permettre l'accès aux équipes pour le remplacement des affiches</Text>

        <Text style={sContract.articleTitle}>7. Résiliation</Text>
        <Text style={sContract.bodyText}>L'établissement peut demander le retrait des supports moyennant un préavis de <Text style={{ fontWeight: 'bold' }}>15 jours</Text>, notifié par écrit (email ou courrier) à {company.name}.</Text>
        <Text style={sContract.bodyText}>{company.name} s'engage à intervenir dans ce délai pour désinstaller les supports.</Text>

        <Text style={sContract.articleTitle}>8. Validation</Text>
        <Text style={sContract.bodyText}>La signature du présent document vaut autorisation d'installation des supports publicitaires dans l'établissement pour la durée indiquée.</Text>

        <Text style={sContract.dateLine}>Fait à {signedCity ?? establishment.city}, le {formatDateFR(signedAt)}</Text>

        <View style={sContract.signatureRow}>
          <View style={sContract.signatureBox}>
            <Text style={sContract.signatureLabel}>L'établissement partenaire</Text>
            <Text style={sContract.signatureName}>{owner.first_name} {owner.last_name}</Text>
            {signatureOwner && <Image src={signatureOwner} style={sContract.signatureImage} />}
          </View>
          <View style={sContract.signatureBox}>
            <Text style={sContract.signatureLabel}>Pour {company.name}</Text>
            {signatureOperator && <Image src={signatureOperator} style={sContract.signatureImage} />}
          </View>
        </View>

        <View style={sContract.footer} fixed>
          <View style={sContract.footerLine}>
            <Text style={sContract.footerText}>Réf. : {contractNumber} — Signé électroniquement — eIDAS UE 910/2014</Text>
            {company.siret && (
              <Text style={sContract.footerText}>{company.name} — SIRET {company.siret}</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ============================================================================
// AmendmentPDF (inline)
// ============================================================================
const cAmend = {
  primary: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  accent: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
}

const sAmend = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: cAmend.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyBlock: { maxWidth: 240 },
  companyName: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  companyLine: { fontSize: 8, color: cAmend.muted, lineHeight: 1.5 },
  docBlock: { textAlign: 'right' },
  docMeta: { fontSize: 8, color: cAmend.muted, lineHeight: 1.6 },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: cAmend.accent },
  subtitle: { fontSize: 9, textAlign: 'center', color: cAmend.muted, marginBottom: 20 },
  articleTitle: { fontSize: 9, fontWeight: 'bold', color: cAmend.accent, marginBottom: 4, marginTop: 14 },
  bodyText: { fontSize: 8, color: cAmend.primary, lineHeight: 1.7, marginBottom: 4 },
  bulletText: { fontSize: 8, color: cAmend.primary, lineHeight: 1.7, marginBottom: 2, paddingLeft: 12 },
  changeBox: { backgroundColor: '#F0FDF4', borderRadius: 4, padding: 8, marginBottom: 6, marginTop: 4 },
  changeBoxRemoved: { backgroundColor: '#FEF2F2', borderRadius: 4, padding: 8, marginBottom: 6, marginTop: 4 },
  changeLabel: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  changeLabelAdded: { color: cAmend.green },
  changeLabelRemoved: { color: cAmend.red },
  changeLine: { fontSize: 8.5, marginBottom: 2 },
  highlightBox: { backgroundColor: cAmend.bg, borderRadius: 4, padding: 8, marginBottom: 6, marginTop: 4 },
  highlightText: { fontSize: 8.5, fontWeight: 'bold', color: cAmend.primary },
  table: { marginBottom: 10, marginTop: 4 },
  thead: { flexDirection: 'row', backgroundColor: cAmend.bg, borderBottomWidth: 1, borderBottomColor: cAmend.border, paddingVertical: 5 },
  th: { fontSize: 7, fontWeight: 'bold', color: cAmend.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  trow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: cAmend.border, paddingVertical: 5 },
  trowNew: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: cAmend.border, paddingVertical: 5, backgroundColor: '#F0FDF4' },
  td: { fontSize: 8.5 },
  colZone: { flex: 1, paddingLeft: 8 },
  colRef: { width: 120, textAlign: 'center' },
  colStatus: { width: 80, textAlign: 'right', paddingRight: 8 },
  newBadge: { fontSize: 7, color: cAmend.green, fontWeight: 'bold' },
  signatureRow: { flexDirection: 'row', gap: 40, marginTop: 16 },
  signatureBox: { flex: 1 },
  signatureLabel: { fontSize: 8, fontWeight: 'bold', color: cAmend.muted, marginBottom: 4 },
  signatureName: { fontSize: 8, color: cAmend.muted, marginBottom: 6 },
  signatureImage: { width: 160, height: 50, objectFit: 'contain' },
  dateLine: { fontSize: 8, color: cAmend.muted, marginBottom: 8, marginTop: 14 },
  partyLine: { fontSize: 8, color: cAmend.muted, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerLine: { borderTopWidth: 0.5, borderTopColor: cAmend.border, paddingTop: 8 },
  footerText: { fontSize: 7, color: cAmend.muted, textAlign: 'center', lineHeight: 1.5 },
})

export interface AmendmentPDFProps {
  amendmentNumber: string
  originalContractNumber: string
  originalSignedAt: string
  signedAt: string
  signedCity: string | null
  reason: 'panel_added' | 'panel_removed' | 'terms_updated'
  establishment: { name: string; address: string; postal_code: string; city: string }
  owner: { first_name: string; last_name: string; role: string }
  panelsAdded: PanelSnapshot[]
  panelsRemoved: PanelSnapshot[]
  panelsAfter: PanelSnapshot[]
  signatureOwner: string
  signatureOperator: string
  company: { name: string; address: string | null; city: string | null; postal_code: string | null; siret: string | null; logoUrl: string | null }
  zoneLabels: Record<string, string>
}

const REASON_LABELS: Record<string, string> = {
  panel_added: 'Ajout de support(s) publicitaire(s)',
  panel_removed: 'Retrait de support(s) publicitaire(s)',
  terms_updated: 'Modification des termes',
}

function AmendmentPDF({
  amendmentNumber, originalContractNumber, originalSignedAt, signedAt, signedCity, reason,
  establishment, owner, panelsAdded, panelsRemoved, panelsAfter, signatureOwner, signatureOperator,
  company, zoneLabels,
}: AmendmentPDFProps) {
  const addedIds = new Set(panelsAdded.map((p) => p.panel_id))
  const pointsTotal = panelsAfter.length * 50

  return (
    <Document>
      <Page size="A4" style={sAmend.page}>
        <View style={sAmend.headerRow}>
          <View style={sAmend.companyBlock}>
            {company.logoUrl && (
              <Image src={company.logoUrl} style={{ width: 100, marginBottom: 6 }} />
            )}
            <Text style={sAmend.companyName}>{company.name}</Text>
            {company.address && <Text style={sAmend.companyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={sAmend.companyLine}>{[company.postal_code, company.city].filter(Boolean).join(' ')}</Text>
            )}
          </View>
          <View style={sAmend.docBlock}>
            <Text style={sAmend.docMeta}>Avenant N° {amendmentNumber}</Text>
            <Text style={sAmend.docMeta}>Contrat : {originalContractNumber}</Text>
            <Text style={sAmend.docMeta}>Date : {formatDateFR(signedAt)}</Text>
          </View>
        </View>

        <Text style={sAmend.title}>Avenant à l'autorisation d'installation de supports publicitaires</Text>
        <Text style={sAmend.subtitle}>Contrat {originalContractNumber} du {formatDateFR(originalSignedAt)}</Text>

        <Text style={sAmend.articleTitle}>1. Parties</Text>
        <Text style={sAmend.bodyText}>Entre {company.name}{company.address ? `, ${company.address}` : ''}{company.postal_code || company.city ? ` – ${[company.postal_code, company.city].filter(Boolean).join(' ')}` : ''},</Text>
        <Text style={sAmend.bodyText}>Et l'établissement « {establishment.name} », {establishment.address}, {establishment.postal_code} {establishment.city}, représenté par {owner.first_name} {owner.last_name} ({owner.role}).</Text>

        <Text style={sAmend.articleTitle}>2. Objet de l'avenant</Text>
        <Text style={sAmend.bodyText}>{REASON_LABELS[reason] ?? reason}. Les parties conviennent de modifier l'autorisation initiale comme suit :</Text>

        {panelsAdded.length > 0 && (
          <View style={sAmend.changeBox}>
            <Text style={[sAmend.changeLabel, sAmend.changeLabelAdded]}>Support{panelsAdded.length > 1 ? 's' : ''} ajouté{panelsAdded.length > 1 ? 's' : ''} ({panelsAdded.length})</Text>
            {panelsAdded.map((p, i) => (
              <Text key={i} style={sAmend.changeLine}>→ Zone : {zoneLabels[p.zone_label] ?? p.zone_label} — Réf : {p.reference}</Text>
            ))}
          </View>
        )}

        {panelsRemoved.length > 0 && (
          <View style={sAmend.changeBoxRemoved}>
            <Text style={[sAmend.changeLabel, sAmend.changeLabelRemoved]}>Support{panelsRemoved.length > 1 ? 's' : ''} retiré{panelsRemoved.length > 1 ? 's' : ''} ({panelsRemoved.length})</Text>
            {panelsRemoved.map((p, i) => (
              <Text key={i} style={sAmend.changeLine}>→ Zone : {zoneLabels[p.zone_label] ?? p.zone_label} — Réf : {p.reference}</Text>
            ))}
          </View>
        )}

        <Text style={sAmend.articleTitle}>3. Supports après avenant</Text>
        <View style={sAmend.table}>
          <View style={sAmend.thead}>
            <Text style={[sAmend.th, sAmend.colZone]}>Zone</Text>
            <Text style={[sAmend.th, sAmend.colRef]}>Référence</Text>
            <Text style={[sAmend.th, sAmend.colStatus]}></Text>
          </View>
          {panelsAfter.map((p, i) => (
            <View key={i} style={addedIds.has(p.panel_id) ? sAmend.trowNew : sAmend.trow}>
              <Text style={[sAmend.td, sAmend.colZone]}>{zoneLabels[p.zone_label] ?? p.zone_label}</Text>
              <Text style={[sAmend.td, sAmend.colRef]}>{p.reference}</Text>
              <Text style={[sAmend.td, sAmend.colStatus]}>
                {addedIds.has(p.panel_id) ? <Text style={sAmend.newBadge}>NOUVEAU</Text> : null}
              </Text>
            </View>
          ))}
        </View>

        <View style={sAmend.highlightBox}>
          <Text style={sAmend.highlightText}>Total : {panelsAfter.length} support{panelsAfter.length !== 1 ? 's' : ''} — Format : 40 × 60 cm</Text>
        </View>

        <Text style={sAmend.articleTitle}>4. Avantage partenaire mis à jour</Text>
        <Text style={sAmend.bodyText}>Suite à cet avenant, la dotation est recalculée sur la base du nouveau nombre de supports :</Text>
        <View style={sAmend.highlightBox}>
          <Text style={sAmend.highlightText}>50 points × {panelsAfter.length} support{panelsAfter.length !== 1 ? 's' : ''} = {pointsTotal} points ({pointsTotal} €)</Text>
        </View>

        <Text style={sAmend.articleTitle}>5. Dispositions inchangées</Text>
        <Text style={sAmend.bodyText}>Toutes les autres clauses de l'autorisation initiale {originalContractNumber} restent inchangées et en vigueur.</Text>

        <Text style={sAmend.articleTitle}>6. Validation</Text>
        <Text style={sAmend.bodyText}>La signature du présent avenant vaut accord des deux parties sur les modifications décrites ci-dessus.</Text>

        <Text style={sAmend.dateLine}>Fait à {signedCity ?? establishment.city}, le {formatDateFR(signedAt)}</Text>

        <View style={sAmend.signatureRow}>
          <View style={sAmend.signatureBox}>
            <Text style={sAmend.signatureLabel}>L'établissement partenaire</Text>
            <Text style={sAmend.signatureName}>{owner.first_name} {owner.last_name}</Text>
            {signatureOwner && <Image src={signatureOwner} style={sAmend.signatureImage} />}
          </View>
          <View style={sAmend.signatureBox}>
            <Text style={sAmend.signatureLabel}>Pour {company.name}</Text>
            {signatureOperator && <Image src={signatureOperator} style={sAmend.signatureImage} />}
          </View>
        </View>

        <View style={sAmend.footer} fixed>
          <View style={sAmend.footerLine}>
            <Text style={sAmend.footerText}>Contrat : {originalContractNumber} — Avenant : {amendmentNumber} — Signé électroniquement — eIDAS UE 910/2014</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ============================================================================
// Handler
// ============================================================================
interface RequestBody {
  type: 'contract' | 'amendment'
  fileName: string
  props: ContractPDFProps | AmendmentPDFProps
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<VercelResponse> {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Server misconfigured (missing env)' })
    }

    const authHeader = req.headers.authorization ?? ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!jwt) {
      return res.status(401).json({ error: 'Missing bearer token' })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !userData.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const body = req.body as RequestBody | undefined
    if (!body || (body.type !== 'contract' && body.type !== 'amendment')) {
      return res.status(400).json({ error: 'Invalid payload : type must be contract|amendment' })
    }
    if (!body.fileName || !body.fileName.startsWith('contracts/') || !body.fileName.endsWith('.pdf')) {
      return res.status(400).json({ error: 'Invalid fileName' })
    }
    if (!body.props) {
      return res.status(400).json({ error: 'Missing props' })
    }

    try {
      const element = body.type === 'contract'
        ? <ContractPDF {...(body.props as ContractPDFProps)} />
        : <AmendmentPDF {...(body.props as AmendmentPDFProps)} />
      const buffer = await renderToBuffer(element)

      const { error: upErr } = await supabase.storage.from('panel-photos').upload(
        body.fileName,
        buffer,
        { contentType: 'application/pdf', upsert: true },
      )
      if (upErr) {
        return res.status(500).json({ error: `Upload failed: ${upErr.message}` })
      }

      return res.status(200).json({ pdfPath: body.fileName, size: buffer.length })
    } catch (e) {
      console.error('[generate-contract-pdf] Render failed', e)
      const msg = e instanceof Error ? `${e.message}\n${e.stack}` : 'Unknown error'
      return res.status(500).json({ error: `PDF gen failed: ${msg}` })
    }
  } catch (e) {
    console.error('[generate-contract-pdf] Fatal error', e)
    const msg = e instanceof Error ? e.message : 'Unknown fatal error'
    return res.status(500).json({ error: `Fatal: ${msg}` })
  }
}

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}
