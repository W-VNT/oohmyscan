// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

/**
 * Edge function : envoie une notification Web Push aux subscriptions
 * d'un utilisateur donné.
 *
 * Peut être appelée de deux façons :
 *
 *  1. Depuis un Database Webhook Supabase (recommandé) : configure via
 *     Dashboard -> Database -> Webhooks, sur INSERT dans notifications.
 *     Le payload est {type: 'INSERT', table: 'notifications',
 *     record: {...notification row}}.
 *
 *  2. Direct HTTP POST avec {user_id, title, body, link?} depuis un
 *     appelant authentifié (test).
 *
 * Secrets Supabase requis (via `supabase secrets set`) :
 *   VAPID_PUBLIC_KEY   : cle publique VAPID
 *   VAPID_PRIVATE_KEY  : cle privee VAPID
 *   VAPID_SUBJECT      : mailto:contact@oohmyad.com
 */

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@oohmyad.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const ALLOWED_ORIGINS = [
  Deno.env.get("APP_URL"),
  "https://oohmyscan.vercel.app",
  "http://localhost:5173",
].filter(Boolean) as string[];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  link?: string;
  notification_id?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(
        JSON.stringify({ error: "VAPID keys non configurées (secrets Supabase)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Parse body — support 2 formats : webhook Supabase OU appel direct
    const body = await req.json();

    let payload: PushPayload;
    if (body.type === "INSERT" && body.table === "notifications" && body.record) {
      // Format Database Webhook : { type, table, record: {...notif} }
      const r = body.record;
      payload = {
        user_id: r.user_id,
        title: r.title,
        body: r.body,
        link: r.link,
        notification_id: r.id,
      };
    } else if (body.user_id && body.title && body.body) {
      // Format direct : { user_id, title, body, link }
      payload = body as PushPayload;
    } else {
      return new Response(
        JSON.stringify({ error: "Format inattendu (attendu: webhook Supabase OU {user_id, title, body})" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch les subscriptions du user
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", payload.user_id);

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Pas de subscription pour cet user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pushJson = JSON.stringify({
      title: payload.title,
      body: payload.body,
      link: payload.link,
      notification_id: payload.notification_id,
    });

    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];

    await Promise.all(
      subs.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushJson,
          );
          sent++;
          // Update last_used_at (best-effort)
          await supabaseAdmin
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
        } catch (e: any) {
          failed++;
          // 404 / 410 : subscription expirée, à supprimer
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            staleIds.push(sub.id);
          }
        }
      }),
    );

    // Cleanup subscriptions expirées
    if (staleIds.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, cleaned: staleIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur serveur" }),
      { status: 500, headers: { ...(getCorsHeaders(req)), "Content-Type": "application/json" } },
    );
  }
});
