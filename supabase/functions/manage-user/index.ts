import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify caller is admin
    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseUser.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Accès réservé aux administrateurs" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { action, userId } = await req.json();

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: "action et userId requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prevent self-deletion
    if (action === "delete" && userId === caller.id) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "reset_password") {
      // Get user email
      const { data: targetUser, error: getUserErr } =
        await supabaseAdmin.auth.admin.getUserById(userId);
      if (getUserErr || !targetUser?.user?.email) {
        return new Response(
          JSON.stringify({ error: "Utilisateur introuvable" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Send reset password email
      const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(
        targetUser.user.email,
        { redirectTo: `${Deno.env.get("APP_URL") || "https://oohmyscan.vercel.app"}/login` },
      );
      if (resetErr) throw resetErr;

      return new Response(
        JSON.stringify({
          success: true,
          message: `Email de réinitialisation envoyé à ${targetUser.user.email}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "delete") {
      // Delete profile first
      await supabaseAdmin.from("profiles").delete().eq("id", userId);

      // Delete auth user
      const { error: deleteErr } =
        await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteErr) throw deleteErr;

      return new Response(
        JSON.stringify({ success: true, message: "Utilisateur supprimé" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Action non reconnue (reset_password ou delete)" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
