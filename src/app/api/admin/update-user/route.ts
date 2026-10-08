import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient();
    const supabase = await createClient();

    // 1. Verificar autenticação de administrador
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
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    const { data: currentProfile } = await adminClient
      .from("user_profiles")
      .select("role, company_id")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (currentProfile?.role !== "Admin") {
      return NextResponse.json({ error: "Apenas administradores podem atualizar perfis de usuários." }, { status: 403 });
    }

    // 2. Extrair dados do body
    const body = await request.json().catch(() => ({}));
    const targetUserId = typeof body.id === "string" ? body.id.trim() : "";
    if (!targetUserId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.nome !== undefined) patch.nome = typeof body.nome === "string" ? body.nome.trim() : "";
    if (body.role !== undefined) patch.role = body.role;
    if (body.telefone !== undefined) patch.telefone = body.telefone ? String(body.telefone).replace(/\D/g, "") : null;
    if (body.ativo !== undefined) patch.ativo = Boolean(body.ativo);
    if (body.client_id !== undefined) patch.client_id = body.client_id ? String(body.client_id).trim() : null;
    if (body.company_id !== undefined) patch.company_id = body.company_id ? String(body.company_id).trim() : null;

    // Se vinculou um cliente e não definiu company_id, busca a empresa do cliente
    if (patch.client_id && !patch.company_id) {
      const { data: clientRow } = await adminClient
        .from("clients")
        .select("company_id")
        .eq("id", patch.client_id)
        .maybeSingle();
      if (clientRow?.company_id) {
        patch.company_id = clientRow.company_id;
      }
    }

    // 3. Atualizar em user_profiles
    const { data: updatedProfile, error: profileErr } = await adminClient
      .from("user_profiles")
      .update(patch)
      .eq("id", targetUserId)
      .select("*")
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: `Erro ao atualizar perfil: ${profileErr.message}` }, { status: 400 });
    }

    // 4. Sincronizar metadados no Supabase Auth
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(targetUserId);
      if (authUser?.user) {
        const currentMeta = authUser.user.user_metadata || {};
        const newMeta: Record<string, any> = { ...currentMeta };
        if (patch.nome !== undefined) newMeta.nome = patch.nome;
        if (patch.role !== undefined) newMeta.role = patch.role;
        if (patch.telefone !== undefined) newMeta.telefone = patch.telefone;
        if (patch.client_id !== undefined) newMeta.client_id = patch.client_id;
        if (patch.company_id !== undefined) newMeta.company_id = patch.company_id;

        await adminClient.auth.admin.updateUserById(targetUserId, {
          user_metadata: newMeta,
        });
      }
    } catch (metaErr) {
      console.warn("Aviso ao sincronizar metadados no Auth:", metaErr);
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("Erro interno ao atualizar usuário:", err);
    return NextResponse.json({ error: err.message || "Erro interno do servidor." }, { status: 500 });
  }
}
