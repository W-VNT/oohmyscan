// Triggered by a Supabase Database Webhook on INSERT INTO contact_requests.
// Sends a notification email to the configured recipient via Resend, with
// Reply-To set to the prospect's email so a direct reply goes back to them.
//
// Required env vars (set via `supabase secrets set ...`):
//   WEBHOOK_SECRET      — must match the `x-webhook-secret` header on the DB webhook
//   CONTACT_NOTIFY_TO   — destination inbox (e.g. test@williamviennet.com)
//
// Reads Resend config from public.company_settings (resend_api_key, email_from, email_from_name).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LOGO_B64 } from "./logo-b64.ts";

const SUPPORT_LABELS: Record<string, string> = {
  "diffusion-sur-mesure": "Diffusion sur-mesure",
  "medias-tactiques": "Médias tactiques",
  "reseaux-affichage": "Réseaux d'affichage",
  "animation-terrain": "Animation terrain",
  "digital": "Digital (SMS/RCS ou Display)",
  "multiple": "Plusieurs familles / Je ne sais pas encore",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

function buildHtml(row: {
  name: string;
  email: string;
  city: string | null;
  support_interest: string | null;
  message: string;
  created_at: string;
}): string {
  const supportLabel = row.support_interest
    ? SUPPORT_LABELS[row.support_interest] ?? row.support_interest
    : "—";
  const cityLabel = row.city || "—";
  const createdLabel = new Date(row.created_at).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Nouvelle demande de devis</title>
</head>
<body style="margin:0;padding:24px;background:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111111;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="background:#F5C400;padding:28px 24px;border-radius:14px 14px 0 0;text-align:center;">
      <img src="cid:logo" alt="OOH MY AD !" width="220" style="display:block;margin:0 auto;width:220px;height:auto;">
      <h1 style="margin:18px 0 0 0;font-size:20px;color:#0A0A0A;font-weight:700;text-align:center;">Nouvelle demande de devis</h1>
    </div>
    <div style="background:#ffffff;border:1px solid #E5E5E5;border-top:none;border-radius:0 0 14px 14px;padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6B7280;width:140px;vertical-align:top;">Nom / Société</td><td style="padding:8px 0;font-weight:600;color:#111111;">${escapeHtml(row.name)}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(row.email)}" style="color:#111111;text-decoration:underline;">${escapeHtml(row.email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;">Ville cible</td><td style="padding:8px 0;color:#111111;">${escapeHtml(cityLabel)}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;">Famille</td><td style="padding:8px 0;color:#111111;">${escapeHtml(supportLabel)}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;vertical-align:top;">Date</td><td style="padding:8px 0;color:#111111;">${escapeHtml(createdLabel)}</td></tr>
      </table>

      <div style="margin-top:20px;padding-top:18px;border-top:1px solid #E5E5E5;">
        <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9CA3AF;">Message</div>
        <p style="margin-top:10px;font-size:14px;line-height:1.65;color:#374151;white-space:pre-wrap;">${nl2br(row.message)}</p>
      </div>
    </div>

    <p style="margin:16px 0 0 0;text-align:center;font-size:11px;color:#9CA3AF;">
      Notification automatique · OOH MY AD !
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Validate webhook secret
    const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!expectedSecret || providedSecret !== expectedSecret) {
      console.error("Invalid or missing webhook secret");
      return new Response("Unauthorized", { status: 401 });
    }

    const notifyTo = Deno.env.get("CONTACT_NOTIFY_TO");
    if (!notifyTo) {
      console.error("CONTACT_NOTIFY_TO env var is not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    // Parse Supabase DB webhook payload — shape: { type, table, record, schema, old_record }
    const payload = await req.json();
    if (payload.type !== "INSERT" || payload.table !== "contact_requests") {
      return new Response("Ignored", { status: 200 });
    }

    const row = payload.record as {
      name: string;
      email: string;
      city: string | null;
      support_interest: string | null;
      message: string;
      created_at: string;
    };

    if (!row?.email || !row?.name || !row?.message) {
      console.error("Malformed record:", row);
      return new Response("Bad payload", { status: 400 });
    }

    // Load Resend config from company_settings
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("company_settings")
      .select("resend_api_key, email_from, email_from_name")
      .limit(1)
      .single();

    if (settingsErr || !settings?.resend_api_key || !settings.email_from) {
      console.error("Missing Resend config:", settingsErr);
      return new Response("Resend not configured", { status: 500 });
    }

    const fromAddress = settings.email_from_name
      ? `${settings.email_from_name} <${settings.email_from}>`
      : settings.email_from;

    const subject = `🎯 Nouvelle demande — ${row.name}`;
    const html = buildHtml(row);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [notifyTo],
        reply_to: row.email,
        subject,
        html,
        attachments: [
          {
            filename: "logo.png",
            content: LOGO_B64,
            content_type: "image/png",
            content_id: "logo",
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: resendData.message ?? "Resend failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
