import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const roles = ["Admin", "Comercial", "Técnico", "Tecnico", "Financeiro", "Cliente", "Terceiro"] as const;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return response({ error: "Authentication required" }, 401);

  // ====================================================================
  // � VARIÁVEIS DE AMBIENTE (via Secrets do Supabase)
  // ====================================================================
  // ⚠️ NÃO use prefixo SUPABASE_ — ele é RESERVADO no Supabase Edge Functions.
  //    Use sempre APP_ ou outro prefixo customizado.
  //
  // 📝 Para configurar no painel do Supabase:
  //    1. Menu → Edge Functions → Secrets
  //    2. Adicione as 3 chaves abaixo (valores do painel → Settings → API):
  //       APP_SUPABASE_URL        = https://seu-projeto.supabase.co
  //       APP_SUPABASE_ANON_KEY   = a chave anon (pública)
  //       APP_SERVICE_ROLE_KEY    = a chave service_role (PRIVADA!)
  // ====================================================================
  const supabaseUrl     = (Deno.env.get("APP_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "").trim();
  const anonKey         = (Deno.env.get("APP_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
  const serviceRoleKey  = (Deno.env.get("APP_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

  if (!supabaseUrl.startsWith("https://")) {
    return response({
      error: "SUPABASE_URL ou APP_SUPABASE_URL não configurada. Configure no painel do Supabase.",
    }, 500);
  }
  if (!anonKey || !serviceRoleKey || anonKey.length < 40 || serviceRoleKey.length < 40) {
    return response({
      error: "Chaves JWT não configuradas ou incompletas. Verifique SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY.",
    }, 500);
  }

  const requester = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: authError } = await requester.auth.getUser(token);
  if (authError || !userData.user) return response({ error: "Invalid session" }, 401);

  const { data: requesterProfile, error: roleError } = await requester
    .from("user_profiles")
    .select("role,company_id")
    .eq("id", userData.user.id)
    .single();
  if (roleError || requesterProfile.role !== "Admin" || !requesterProfile.company_id) {
    return response({ error: "Administrator access required" }, 403);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return response({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const name = typeof input.nome === "string" ? input.nome.trim() : "";
  const role = input.role;
  const dbRole = role === "Técnico" ? "Tecnico" : role;
  const phone = typeof input.telefone === "string" ? input.telefone.replace(/\D/g, "") : null;
  if (!email.includes("@") || name.length < 2 || !roles.includes(role as typeof roles[number])) {
    return response({ error: "Valid email, name, and role are required" }, 400);
  }

  const temporaryPassword = generateTemporaryPassword();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      nome: name,
      role: dbRole,
      telefone: phone,
    },
  });
  if (createError || !created.user) return response({ error: createError?.message ?? "User creation failed" }, 400);

  const profileUpdate: Record<string, unknown> = {
    telefone: phone,
    company_id: requesterProfile.company_id,
  };
  if (dbRole !== "Cliente") profileUpdate.role = dbRole;
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .update(profileUpdate)
    .eq("id", created.user.id)
    .select("*")
    .single();

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return response({ error: profileError.message }, 500);
  }

  return response({
    profile: { ...profile, email: created.user.email },
    temporaryPassword,
  }, 201);
});