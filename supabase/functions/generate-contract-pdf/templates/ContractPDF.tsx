// ============================================================================
// Port serveur-side de src/lib/pdf/ContractPDF.tsx.
// Meme layout / meme structure. Seul changement : fontFamily = 'Roboto' au
// lieu de 'Helvetica' (voir fonts.ts pour le pourquoi).
// ============================================================================
/** @jsx createElement */
import { createElement } from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDateFR } from "../helpers.ts";

const c = {
  primary: "#0A0A0A",
  muted: "#737373",
  border: "#E5E5E5",
  bg: "#FAFAFA",
  accent: "#F5C400",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Roboto", color: c.primary },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.primary },
  companyBlock: { maxWidth: 240 },
  companyName: { fontSize: 13, fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 },
  companyLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  docBlock: { textAlign: "right" },
  docMeta: { fontSize: 8, color: c.muted, lineHeight: 1.6 },
  titleWrap: { alignItems: "center", marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", color: c.primary, letterSpacing: 0.5, textTransform: "uppercase" },
  titleAccent: { width: 36, height: 3, backgroundColor: c.accent, marginTop: 8 },
  subtitle: { fontSize: 9, textAlign: "center", color: c.muted, marginBottom: 20, textTransform: "uppercase", letterSpacing: 1.5 },
  partiesRow: { flexDirection: "row", gap: 20, marginBottom: 16 },
  partyBox: { flex: 1, backgroundColor: c.bg, borderRadius: 4, padding: 12, borderLeftWidth: 3, borderLeftColor: c.accent },
  partyLabel: { fontSize: 7, fontWeight: 700, color: c.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  partyName: { fontSize: 10, fontWeight: 700, marginBottom: 2, color: c.primary },
  partyLine: { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  articleTitle: { fontSize: 10, fontWeight: 700, color: c.primary, marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  bodyText: { fontSize: 8, color: c.primary, lineHeight: 1.7, marginBottom: 4 },
  bulletText: { fontSize: 8, color: c.primary, lineHeight: 1.7, marginBottom: 2, paddingLeft: 12 },
  highlightBox: { backgroundColor: c.bg, borderRadius: 4, padding: 10, marginBottom: 6, marginTop: 6, borderLeftWidth: 3, borderLeftColor: c.accent },
  highlightText: { fontSize: 9, fontWeight: 700, color: c.primary },
  highlightSubtext: { fontSize: 8, color: c.primary, marginTop: 3 },
  signatureRow: { flexDirection: "row", gap: 40, marginTop: 24 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: c.primary, paddingTop: 8 },
  signatureLabel: { fontSize: 8, fontWeight: 700, color: c.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  signatureName: { fontSize: 8, color: c.muted, marginBottom: 6 },
  signatureImage: { width: 160, height: 50, objectFit: "contain" },
  dateLine: { fontSize: 8, color: c.muted, marginBottom: 8 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40 },
  footerLine: { borderTopWidth: 0.5, borderTopColor: c.border, paddingTop: 8 },
  footerText: { fontSize: 7, color: c.muted, textAlign: "center", lineHeight: 1.5 },
});

interface PanelSnapshot {
  panel_id: string;
  zone_label: string;
  qr_code: string;
  reference: string;
}

export interface ContractPDFProps {
  contractNumber: string;
  signedAt: string;
  signedCity: string | null;
  establishment: {
    name: string;
    address: string;
    postal_code: string;
    city: string;
    phone: string | null;
  };
  owner: {
    first_name: string;
    last_name: string;
    role: string;
    email: string | null;
  };
  closingMonths: string | null;
  panels: PanelSnapshot[];
  panelFormat?: { name: string; width_cm: number | null; height_cm: number | null } | null;
  signatureOwner: string;
  signatureOperator: string;
  company: {
    name: string;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    siret: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
}

export function ContractPDF({
  contractNumber,
  signedAt,
  signedCity,
  establishment,
  owner,
  panels,
  panelFormat,
  signatureOwner,
  signatureOperator,
  company,
}: ContractPDFProps) {
  const pointsTotal = panels.length * 50;
  const formatLine = panelFormat
    ? panelFormat.width_cm && panelFormat.height_cm
      ? `${panelFormat.name} — ${panelFormat.width_cm} × ${panelFormat.height_cm} cm`
      : panelFormat.name
    : "Selon spécifications techniques convenues";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View style={s.companyBlock}>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={{ width: 130, marginBottom: 6 }} />
            ) : (
              <Text style={s.companyName}>{company.name}</Text>
            )}
            {company.address && <Text style={s.companyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={s.companyLine}>{[company.postal_code, company.city].filter(Boolean).join(" ")}</Text>
            )}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docMeta}>N° {contractNumber}</Text>
            <Text style={s.docMeta}>Date : {formatDateFR(signedAt)}</Text>
          </View>
        </View>

        <View style={s.titleWrap}>
          <Text style={s.title}>Autorisation d'installation</Text>
          <View style={s.titleAccent} />
        </View>

        <Text style={s.subtitle}>Entre</Text>

        <View style={s.partiesRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>L'entreprise</Text>
            <Text style={s.partyName}>{company.name}</Text>
            {company.address && <Text style={s.partyLine}>{company.address}</Text>}
            {(company.postal_code || company.city) && (
              <Text style={s.partyLine}>{[company.postal_code, company.city].filter(Boolean).join(" ")}</Text>
            )}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>L'établissement partenaire</Text>
            <Text style={s.partyName}>{establishment.name}</Text>
            <Text style={s.partyLine}>{establishment.address}</Text>
            <Text style={s.partyLine}>{establishment.postal_code} {establishment.city}</Text>
            {establishment.phone && <Text style={s.partyLine}>Tél : {establishment.phone}</Text>}
            <Text style={[s.partyLine, { marginTop: 4 }]}>Représentant : {owner.first_name} {owner.last_name} ({owner.role})</Text>
            {owner.email && <Text style={s.partyLine}>Email : {owner.email}</Text>}
          </View>
        </View>

        <Text style={s.articleTitle}>1. Objet</Text>
        <Text style={s.bodyText}>
          L'établissement autorise {company.name} à installer un ou plusieurs supports publicitaires au sein de son établissement.
        </Text>
        <Text style={s.bodyText}>
          Ces supports permettent la diffusion de campagnes publicitaires renouvelées périodiquement par les équipes de {company.name}.
        </Text>

        <Text style={s.articleTitle}>2. Durée</Text>
        <Text style={s.bodyText}>
          L'autorisation est accordée pour la période estivale :
        </Text>
        <View style={s.highlightBox}>
          <Text style={s.highlightText}>du 1er juin au 30 septembre</Text>
        </View>
        <Text style={s.bodyText}>
          Les supports restent installés durant cette période et les affiches peuvent être renouvelées ponctuellement par nos équipes.
        </Text>

        <Text style={s.articleTitle}>3. Identification et suivi</Text>
        <Text style={s.bodyText}>
          Chaque support installé est identifié par un QR code unique permettant :
        </Text>
        <Text style={s.bulletText}>• la validation de l'installation</Text>
        <Text style={s.bulletText}>• le suivi des campagnes publicitaires</Text>
        <Text style={s.bulletText}>• la traçabilité des interventions effectuées par les équipes</Text>

        <Text style={s.articleTitle}>4. Nombre de supports</Text>
        <View style={s.highlightBox}>
          <Text style={s.highlightText}>Nombre de supports installés : {panels.length}</Text>
          <Text style={s.highlightSubtext}>Format : {formatLine}</Text>
        </View>

        <Text style={s.articleTitle} break>5. Avantage partenaire</Text>
        <Text style={s.bodyText}>
          En contrepartie de l'autorisation d'installation des supports, l'établissement bénéficie d'une dotation en points cadeaux.
        </Text>
        <Text style={s.bodyText}>
          Chaque support installé ouvre droit à :
        </Text>
        <View style={s.highlightBox}>
          <Text style={s.highlightText}>50 points cadeaux (valeur 50 €) × {panels.length} support{panels.length !== 1 ? "s" : ""} = {pointsTotal} points ({pointsTotal} €)</Text>
        </View>
        <Text style={s.bodyText}>
          Les points sont attribués à la fin de la période d'exploitation et sont convertibles sur la plateforme partenaire ACAD, donnant accès à une sélection de produits parmi plus de 500 références.
        </Text>

        <Text style={s.articleTitle}>6. Engagements</Text>
        <Text style={s.bodyText}>L'établissement s'engage à :</Text>
        <Text style={s.bulletText}>• maintenir les supports installés pendant la durée de l'autorisation</Text>
        <Text style={s.bulletText}>• permettre l'accès aux équipes pour le remplacement des affiches</Text>

        <Text style={s.articleTitle}>7. Résiliation</Text>
        <Text style={s.bodyText}>
          L'établissement peut demander le retrait des supports moyennant un préavis de <Text style={{ fontWeight: 700 }}>15 jours</Text>, notifié par écrit (email ou courrier) à {company.name}.
        </Text>
        <Text style={s.bodyText}>
          {company.name} s'engage à intervenir dans ce délai pour désinstaller les supports.
        </Text>

        <Text style={s.articleTitle}>8. Validation</Text>
        <Text style={s.bodyText}>
          La signature du présent document vaut autorisation d'installation des supports publicitaires dans l'établissement pour la durée indiquée.
        </Text>

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

        <View style={s.footer} fixed>
          <View style={s.footerLine}>
            <Text style={s.footerText}>
              Réf. : {contractNumber} — Signé électroniquement — eIDAS UE 910/2014
            </Text>
            {company.siret && (
              <Text style={s.footerText}>
                {company.name} — SIRET {company.siret}
              </Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
