import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/recuperar-senha", "/redefinir-senha"];

function isPublicRoute(pathname: string) {
  if (pathname === "/" || pathname === "") return true;
  return PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (_) {
    user = null;
  }

  if (user && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  if (!user && !isPublicRoute(pathname)) {
    const dest = new URL("/login", origin);
    if (pathname && pathname !== "/") {
      dest.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|public|images).*)",
  ],
};
