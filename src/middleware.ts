import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error: authError } = await supabase.auth.getUser();
  const user = data.user;

  // If auth check failed but user has a session cookie, don't kick them out.
  // This handles offline/network errors and Safari cookie quirks.
  if (authError && !user) {
    const hasSessionCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
    if (hasSessionCookie) {
      return supabaseResponse;
    }
  }

  const pathname = request.nextUrl.pathname;

  // Auth routes - redirect to dashboard if already logged in
  const authRoutes = ["/login", "/register", "/reset-password"];
  if (user && authRoutes.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protected routes - redirect to login if not logged in
  const protectedPrefixes = [
    "/dashboard",
    "/add-dog",
    "/dog",
    "/dog-caught",
    "/map",
    "/gallery",
    "/adopt",
    "/veterinary",
    "/report",
    "/change-nickname",
    "/change-password",
    "/admin",
  ];
  if (
    !user &&
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
