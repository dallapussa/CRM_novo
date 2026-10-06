import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile && data.user.email) {
          const fullName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email.split("@")[0];

          await supabase.from("user_profiles").insert({
            id: data.user.id,
            email: data.user.email,
            nome: fullName,
            role: "Cliente",
            ativo: true,
          });
        }
      } catch (profileErr) {
        console.error("Erro ao verificar/criar perfil do usuário OAuth:", profileErr);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
