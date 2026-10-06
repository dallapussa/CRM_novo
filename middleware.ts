import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_ROUTES = [
  "/login",
  "/recuperar-senha",
  "/redefinir-senha",
  "/auth/callback",
  "/privacidade",
  "/termos",
];

type UserRole = "admin" | "comercial" | "tecnico" | "financeiro" | "cliente" | "terceiro";
type RolePermission =
  | "dashboard" | "users" | "clients" | "leads" | "quotes" | "agenda" | "whatsapp"
  | "catalog" | "extinguishers" | "hoses" | "service_orders" | "bench" | "orders" | "receipts"
  | "reports" | "customer_portal" | "financial_costs";

const ROLE_PERMISSIONS: Record<UserRole, readonly RolePermission[]> = {
  admin:        ["dashboard","users","clients","leads","quotes","agenda","whatsapp","catalog","extinguishers","hoses","service_orders","bench","orders","receipts","reports","customer_portal","financial_costs"],
  comercial:    ["dashboard","clients","leads","quotes","agenda","whatsapp","catalog"],
  tecnico:      ["dashboard","clients","extinguishers","hoses","service_orders","bench"],
  financeiro:   ["dashboard","orders","receipts","reports"],
  cliente:      ["customer_portal"],
  terceiro:     ["customer_portal"],
};

const PATH_PERMISSION: Record<string, RolePermission> = {
  "/dashboard": "dashboard",
  "/dashboard/usuarios": "users",
  "/dashboard/clientes": "clients",
  "/dashboard/leads": "leads",
  "/dashboard/orcamentos": "quotes",
  "/dashboard/agenda": "agenda",
  "/dashboard/whatsapp": "whatsapp",
  "/dashboard/produtos": "catalog",
  "/dashboard/extintores": "extinguishers",
  "/dashboard/mangueiras": "hoses",
  "/dashboard/os": "service_orders",
  "/dashboard/bancada": "bench",
  "/dashboard/pedidos": "orders",
  "/dashboard/financeiro": "receipts",
  "/dashboard/relatorios": "reports",
  "/dashboard/custos": "financial_costs",
  "/dashboard/vencimentos": "dashboard",
  "/dashboard/lotes": "service_orders",
};

function hasPermission(role: UserRole | null | undefined, permission: RolePermission): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role].includes(permission));
}

function getPermissionForPath(pathname: string): RolePermission | null {
  if (pathname === "/dashboard/perfil") return null;
  if (pathname === "/dashboard") return null;
  const keys = Object.keys(PATH_PERMISSION).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (pathname === k || pathname.startsWith(k + "/")) return PATH_PERMISSION[k];
  }
  return null;
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Se a autenticação OAuth retornar na raiz com ?code=, redireciona imediatamente para o handler de callback
  if (pathname === "/" && searchParams.has("code")) {
    const callbackUrl = new URL("/auth/callback", request.url);
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(callbackUrl);
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicRoute(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    const redirect = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (pathname !== "/") loginUrl.searchParams.set("redirect", redirect);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname.startsWith("/dashboard")) {
    const permission = getPermissionForPath(pathname);
    if (permission !== null) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role) {
        const dbRoleToApp: Record<string, UserRole> = {
          "Admin": "admin",
          "Comercial": "comercial",
          "Técnico": "tecnico",
          "Financeiro": "financeiro",
          "Cliente": "cliente",
          "Terceiro": "terceiro",
        };
        const appRole = dbRoleToApp[String(profile.role)] ?? "cliente";

        let effectivePermission: RolePermission = permission;
        if (pathname === "/dashboard") {
          effectivePermission = hasPermission(appRole, "dashboard") ? "dashboard" : "customer_portal";
        }

        if (!hasPermission(appRole, effectivePermission)) {
          const fallback = new URL(
            hasPermission(appRole, "dashboard") ? "/dashboard" : "/dashboard/perfil",
            request.url
          );
          return NextResponse.redirect(fallback);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif)$).*)",
  ],
};
