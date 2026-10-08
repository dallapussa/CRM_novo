import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient();
    const supabase = await createClient();

    // 1. Verifica autenticação do Administrador
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    let currentUser = null;
    if (token) {
      const { data } = await adminClient.auth.getUser(token);
      if (data?.user) currentUser = data.user;
    }
    if (!currentUser) {
      const { data } = await supabase.auth.getUser();
      if (data?.user) currentUser = data.user;
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Sessão inválida ou expirada. Faça login novamente." }, { status: 401 });
    }

    const { data: currentProfile } = await adminClient
      .from("user_profiles")
      .select("role, company_id")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (currentProfile?.role !== "Admin" || !currentProfile?.company_id) {
      return NextResponse.json({ error: "Apenas administradores podem gerenciar acessos de clientes." }, { status: 403 });
    }

    // 2. Extrai dados da requisição
    const body = await request.json().catch(() => ({}));
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const nome = typeof body.nome === "string" ? body.nome.trim() : "Cliente";

    if (!clientId) {
      return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Informe um e-mail válido para o cliente." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "A senha de acesso deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    // Identifica dados da empresa vinculada ao cliente
    const { data: clientRow } = await adminClient
      .from("clients")
      .select("id, company_id, razao_social, nome_fantasia")
      .eq("id", clientId)
      .maybeSingle();

    const effectiveCompanyId = clientRow?.company_id || currentProfile?.company_id || null;

    // 3. Localiza se já existe um usuário vinculado a este cliente ou com este e-mail
    let targetUserId = "";
    let existingAuthUser = null;

    // 3.1 Busca em user_profiles por client_id ou email
    const { data: existingProfileByClient } = await adminClient
      .from("user_profiles")
      .select("id, email")
      .eq("client_id", clientId)
      .maybeSingle();

    const { data: existingProfileByEmail } = await adminClient
      .from("user_profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    const knownUserId = existingProfileByClient?.id || existingProfileByEmail?.id;

    if (knownUserId) {
      const { data: authResult } = await adminClient.auth.admin.getUserById(knownUserId);
      if (authResult?.user) {
        existingAuthUser = authResult.user;
        targetUserId = authResult.user.id;
      }
    }

    // 3.2 Se ainda não achou, faz busca na lista de usuários Auth
    if (!existingAuthUser) {
      const { data: usersList } = await adminClient.auth.admin.listUsers();
      const matched = usersList?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase() || u.user_metadata?.client_id === clientId
      );
      if (matched) {
        existingAuthUser = matched;
        targetUserId = matched.id;
      }
    }

    if (existingAuthUser) {
      // Atualiza senha e metadados
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        email,
        password,
        user_metadata: {
          ...existingAuthUser.user_metadata,
          client_id: clientId,
          company_id: effectiveCompanyId,
          nome,
          role: "Cliente",
        },
      });

      if (updateAuthError) {
        return NextResponse.json({ error: `Erro ao atualizar usuário no Auth: ${updateAuthError.message}` }, { status: 400 });
      }
    } else {
      // Cria novo usuário no Auth
      const { data: created, error: createAuthError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          client_id: clientId,
          company_id: effectiveCompanyId,
          nome,
          role: "Cliente",
        },
      });

      if (createAuthError || !created.user) {
        return NextResponse.json({ error: `Erro ao criar usuário no Auth: ${createAuthError?.message}` }, { status: 400 });
      }
      targetUserId = created.user.id;
    }

    // 4. Garante sincronização em user_profiles com role Cliente, client_id e company_id
    await adminClient.from("user_profiles").upsert({
      id: targetUserId,
      nome,
      email,
      role: "Cliente",
      client_id: clientId,
      company_id: effectiveCompanyId,
      ativo: true,
      updated_at: new Date().toISOString(),
    });

    // 5. Atualiza o e-mail no registro do cliente
    await adminClient
      .from("clients")
      .update({
        email,
      })
      .eq("id", clientId);

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      email,
      password,
      message: "Acesso ao Portal do Cliente configurado com sucesso!",
    });
  } catch (err: any) {
    console.error("Erro ao configurar acesso de cliente:", err);
    return NextResponse.json({ error: err.message || "Erro interno do servidor." }, { status: 500 });
  }
}
