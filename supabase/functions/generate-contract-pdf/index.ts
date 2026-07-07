// ============================================================================
// Edge Function : generate-contract-pdf
//
// Genere un PDF de contrat (autorisation) ou d'avenant cote serveur.
// Remplace la generation client-side @react-pdf/renderer qui asphyxiait les
// telephones bas de gamme.
//
// Auth : verify_jwt=true (defaut). Un utilisateur authentifie qui a insert
// le contract row en amont peut appeler la fonction. On ne re-check pas
// created_by/is_admin : si le contract existe deja en DB, il a passe la
// RLS INSERT, c'est bon.
//
// Input : POST body {
//   contractId: uuid,
//   type: 'contract' | 'amendment',
//   email?: {
//     to: string,
//     subjectTemplate: string | null,
//     bodyTemplate: string | null,
//     ownerFirstName: string,
//     ownerLastName: string,
//     establishmentName: string,
//     companyName: string,
//   }
// }
//
// Le bloc email est optionnel : si fourni, l'edge fn envoie le contrat par
// email au gerant apres la generation du PDF. Ca permet au client de faire
// fire-and-forget (invoke sans await), le success step est immediat.
//
// Output :
//   200 : { path: string, size: number, emailSent?: boolean, emailError?: string }
//   400 : { error: 'invalid input' }
//   404 : { error: 'contract/amendment not found' }
//   500 : { error: string, stack?: string }
// ============================================================================
/** @jsx createElement */
import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import "./fonts.ts"; // side-effect : Font.register Roboto
import { ContractPDF } from "./templates/ContractPDF.tsx";
import { AmendmentPDF } from "./templates/AmendmentPDF.tsx";
import { blobToDataUrl } from "./helpers.ts";

const ALLOWED_ORIGINS = [
  Deno.env.get("APP_URL"),
  "https://oohmyad.fr",
  "https://www.oohmyad.fr",
  "https://oohmyscan.vercel.app",
  "http://localhost:5173",
].filter(Boolean) as string[];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405, corsHeaders);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const contractId = String(body?.contractId ?? "").trim();
    const type = body?.type === "amendment" ? "amendment" : "contract";
    const emailReq = body?.email as EmailRequest | undefined;
    if (!contractId) {
      return json({ error: "contractId required" }, 400, corsHeaders);
    }

    // Client service_role : bypass RLS pour lire company_settings + storage.
    // Ok car on est deja post-auth (verify_jwt=true de la config par defaut).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth caller header (pour transmettre au send-document-email en aval)
    const authHeader = req.headers.get("Authorization") ?? "";

    let result;
    if (type === "contract") {
      result = await generateContractPdf(admin, contractId);
    } else {
      result = await generateAmendmentPdf(admin, contractId);
    }

    // Envoi email en aval (only pour les nouveaux contrats, pas les avenants).
    // Best-effort : si l'email fail, on renvoie quand meme 200 avec emailError,
    // le PDF est deja genere et update en DB.
    if (type === "contract" && emailReq?.to && result.pdfBytes) {
      const emailResult = await sendContractEmail(authHeader, emailReq, result);
      return json(
        { path: result.path, size: result.size, emailSent: emailResult.ok, emailError: emailResult.error },
        200,
        corsHeaders,
      );
    }

    return json({ path: result.path, size: result.size }, 200, corsHeaders);
  } catch (err) {
    console.error("[generate-contract-pdf] error:", err);
    return json(
      {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      500,
      corsHeaders,
    );
  }
});

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

interface EmailRequest {
  to: string;
  subjectTemplate?: string | null;
  bodyTemplate?: string | null;
  ownerFirstName?: string;
  ownerLastName?: string;
  establishmentName?: string;
  companyName?: string;
}

interface PdfGenResult {
  path: string;
  size: number;
  contractNumber: string;
  pdfBytes: Uint8Array | null;
}

// ============================================================================
// Email (chain vers send-document-email)
// ============================================================================
const CONTRACT_EMAIL_FALLBACK_SUBJECT = "Votre contrat d'installation {numero} — {entreprise}";
const CONTRACT_EMAIL_FALLBACK_BODY =
  `<p>Bonjour {gerant_prenom},</p><p>Vous trouverez ci-joint votre <strong>contrat d'autorisation d'installation N° {numero}</strong>, signé électroniquement.</p><p>L'équipe {entreprise}</p>`;

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function sendContractEmail(
  authHeader: string,
  emailReq: EmailRequest,
  pdf: PdfGenResult,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!pdf.pdfBytes) return { ok: false, error: "no PDF bytes" };
    const vars: Record<string, string> = {
      numero: pdf.contractNumber,
      gerant_prenom: emailReq.ownerFirstName ?? "",
      gerant_nom: emailReq.ownerLastName ?? "",
      etablissement: emailReq.establishmentName ?? "",
      entreprise: emailReq.companyName ?? "OOHMYAD",
    };
    const subject = interpolate(emailReq.subjectTemplate || CONTRACT_EMAIL_FALLBACK_SUBJECT, vars);
    const html = interpolate(emailReq.bodyTemplate || CONTRACT_EMAIL_FALLBACK_BODY, vars);
    const pdfBase64 = bytesToBase64(pdf.pdfBytes);

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-document-email`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        to: emailReq.to,
        subject,
        html,
        pdfBase64,
        pdfFilename: `contrat-${pdf.contractNumber}.pdf`,
        documentType: "contract",
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, error: `send-document-email HTTP ${res.status}: ${errBody.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "email invoke failed" };
  }
}

// ============================================================================
// Contract PDF
// ============================================================================
async function generateContractPdf(admin: SupabaseClient, contractId: string): Promise<PdfGenResult> {
  // 1. Fetch contract row
  const { data: contract, error: cErr } = await admin
    .from("panel_contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (cErr) throw new Error(`panel_contracts fetch: ${cErr.message}`);
  if (!contract) throw new Error("contract not found");

  // 2. Fetch company settings
  const company = await fetchCompany(admin);

  // 3. Panel format (nullable, fallback si pas trouve)
  const panelFormat = await fetchDefaultPanelFormat(admin, company.default_panel_type_id);

  // 4. Download signatures depuis storage -> base64 data URL
  const [sigOwner, sigOperator] = await Promise.all([
    downloadAsDataUrl(admin, contract.signature_owner),
    downloadAsDataUrl(admin, contract.signature_operator),
  ]);

  // 5. Render PDF
  const element = createElement(ContractPDF, {
    contractNumber: contract.contract_number,
    signedAt: contract.signed_at,
    signedCity: contract.signed_city ?? contract.establishment_city ?? null,
    establishment: {
      name: contract.establishment_name,
      address: contract.establishment_address,
      postal_code: contract.establishment_postal_code,
      city: contract.establishment_city,
      phone: contract.establishment_phone,
    },
    owner: {
      first_name: contract.owner_first_name,
      last_name: contract.owner_last_name,
      role: contract.owner_role,
      email: contract.owner_email,
    },
    closingMonths: contract.closing_months,
    panels: Array.isArray(contract.panels_snapshot) ? contract.panels_snapshot : [],
    panelFormat,
    signatureOwner: sigOwner,
    signatureOperator: sigOperator,
    company,
  });

  // @ts-expect-error : types incomplets sur npm: specifier @react-pdf
  const blob = await pdf(element).toBlob();
  const bytes = new Uint8Array(await blob.arrayBuffer());

  // 6. Upload dans storage
  const path = `contracts/${contract.contract_number}.pdf`;
  const { error: upErr } = await admin.storage
    .from("panel-photos")
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  // 7. Update contract.storage_path
  const { error: updErr } = await admin
    .from("panel_contracts")
    .update({ storage_path: path })
    .eq("id", contractId);
  if (updErr) throw new Error(`update storage_path: ${updErr.message}`);

  return { path, size: bytes.byteLength, contractNumber: contract.contract_number, pdfBytes: bytes };
}

// ============================================================================
// Amendment PDF
// ============================================================================
async function generateAmendmentPdf(admin: SupabaseClient, amendmentId: string): Promise<PdfGenResult> {
  // 1. Fetch amendment row + parent contract
  const { data: amendment, error: aErr } = await admin
    .from("contract_amendments")
    .select("*")
    .eq("id", amendmentId)
    .single();
  if (aErr) throw new Error(`contract_amendments fetch: ${aErr.message}`);
  if (!amendment) throw new Error("amendment not found");

  const { data: parent, error: pErr } = await admin
    .from("panel_contracts")
    .select("*")
    .eq("id", amendment.contract_id)
    .single();
  if (pErr) throw new Error(`parent contract fetch: ${pErr.message}`);
  if (!parent) throw new Error("parent contract not found");

  const company = await fetchCompany(admin);

  const [sigOwner, sigOperator] = await Promise.all([
    downloadAsDataUrl(admin, amendment.signature_owner),
    downloadAsDataUrl(admin, amendment.signature_operator),
  ]);

  const element = createElement(AmendmentPDF, {
    amendmentNumber: amendment.amendment_number,
    originalContractNumber: parent.contract_number,
    originalSignedAt: parent.signed_at,
    signedAt: amendment.signed_at,
    signedCity: amendment.signed_city ?? parent.establishment_city ?? null,
    reason: amendment.reason,
    establishment: {
      name: parent.establishment_name,
      address: parent.establishment_address,
      postal_code: parent.establishment_postal_code,
      city: parent.establishment_city,
    },
    owner: {
      first_name: parent.owner_first_name,
      last_name: parent.owner_last_name,
      role: parent.owner_role,
    },
    panelsAdded: Array.isArray(amendment.panels_added) ? amendment.panels_added : [],
    panelsRemoved: Array.isArray(amendment.panels_removed) ? amendment.panels_removed : [],
    panelsAfter: Array.isArray(amendment.panels_snapshot) ? amendment.panels_snapshot : [],
    signatureOwner: sigOwner,
    signatureOperator: sigOperator,
    company,
  });

  // @ts-expect-error : types incomplets sur npm: specifier @react-pdf
  const blob = await pdf(element).toBlob();
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const path = `contracts/${amendment.amendment_number}.pdf`;
  const { error: upErr } = await admin.storage
    .from("panel-photos")
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  const { error: updErr } = await admin
    .from("contract_amendments")
    .update({ storage_path: path })
    .eq("id", amendmentId);
  if (updErr) throw new Error(`update storage_path: ${updErr.message}`);

  return { path, size: bytes.byteLength, contractNumber: amendment.amendment_number, pdfBytes: bytes };
}

// ============================================================================
// Helpers DB / storage
// ============================================================================
async function fetchCompany(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("company_settings")
    .select("id, company_name, address, city, postal_code, siret, phone, email, logo_path, default_panel_type_id")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`company_settings fetch: ${error.message}`);
  if (!data) throw new Error("company_settings vide");

  const logoUrl = data.logo_path
    ? await downloadAsDataUrl(admin, data.logo_path, "company-assets")
    : null;

  return {
    name: data.company_name ?? "",
    address: data.address ?? null,
    city: data.city ?? null,
    postal_code: data.postal_code ?? null,
    siret: data.siret ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    logoUrl,
    default_panel_type_id: data.default_panel_type_id as string | null,
  };
}

async function fetchDefaultPanelFormat(admin: SupabaseClient, panelTypeId: string | null) {
  if (!panelTypeId) return null;
  const { data } = await admin
    .from("panel_formats")
    .select("name, width_cm, height_cm")
    .eq("id", panelTypeId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Telecharge un fichier depuis storage et le retourne en data URL base64.
 * bucket : par defaut panel-photos (signatures + contracts). Peut etre
 * override pour company-assets (logo).
 */
async function downloadAsDataUrl(
  admin: SupabaseClient,
  path: string | null | undefined,
  bucket = "panel-photos",
): Promise<string> {
  if (!path) return "";
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error) {
    console.warn(`[storage] download failed for ${bucket}/${path}:`, error.message);
    return "";
  }
  if (!data) return "";
  return await blobToDataUrl(data);
}
