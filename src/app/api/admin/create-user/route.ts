import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Verificar se quem está chamando é um Administrador logado
    const adminClient = createAdminClient();
    const supabase = await createClient();
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    let currentUser = null;

    if (token) {
      const { data, error } = await adminClient.auth.getUser(token);
      if (!error && data?.user) {
        currentUser = data.user;
      }
    }

    if (!currentUser) {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        currentUser = data.user;
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Sessão inválida ou expirada. Faça login novamente." }, { status: 401 });
    }

    const { data: currentProfile, error: profileCheckError } = await adminClient
      .from("user_profiles")
      .select("role, company_id")
      .eq("id", currentUser.id)
      .single();

    if (profileCheckError || currentProfile?.role !== "Admin" || !currentProfile?.company_id) {
      return NextResponse.json({ error: "Apenas administradores podem cadastrar novos usuários." }, { status: 403 });
    }

    // 2. Validar payload de entrada
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    let role = typeof body.role === "string" ? body.role.trim() : "Cliente";
    const telefone = typeof body.telefone === "string" ? body.telefone.replace(/\D/g, "") : null;

    if (!email.includes("@") || nome.length < 2) {
      return NextResponse.json({ error: "Informe um e-mail válido e o nome do usuário." }, { status: 400 });
    }

    // Normalizar role para o banco (ex: Técnico -> Tecnico se o enum do banco não tiver acento)
    if (role === "Técnico") {
      role = "Tecnico";
    }

    const temporaryPassword = generateTemporaryPassword();

    // 3. Criar usuário no Supabase Auth com service role key
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        nome,
        role,
        telefone,
      },
    });

    if (createError || !createdUser.user) {
      return NextResponse.json({ error: createError?.message || "Erro ao criar usuário no banco." }, { status: 400 });
    }

    // 4. Vincular a empresa (company_id) no user_profiles usando o contexto do admin autenticado
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "https://hzmxwbxbidnvclkoozaw.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXh3YnhiaWRudmNsa29vemF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTQxODksImV4cCI6MjEwNjIzMDE4OX0.AHJjEaO2sV5KMKpzc_mv9gqsrTSjxhlw0CL2bZZMIcg";
    const updaterClient = token
      ? createSupabaseClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
      : supabase;

    const { error: companyLinkError } = await updaterClient
      .from("user_profiles")
      .update({
        company_id: currentProfile.company_id,
        telefone,
      })
      .eq("id", createdUser.user.id);

    if (companyLinkError) {
      console.error("Aviso ao vincular empresa:", companyLinkError);
    }

    // 5. Retornar perfil e senha temporária
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("*")
      .eq("id", createdUser.user.id)
      .maybeSingle();

    return NextResponse.json({
      profile: {
        id: createdUser.user.id,
        email: createdUser.user.email,
        nome: profile?.nome || nome,
        role: profile?.role || role,
        telefone: profile?.telefone || telefone,
        ativo: true,
      },
      temporaryPassword,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Erro interno ao criar usuário:", err);
    return NextResponse.json({ error: err?.message || "Erro interno do servidor." }, { status: 500 });
  }
}
