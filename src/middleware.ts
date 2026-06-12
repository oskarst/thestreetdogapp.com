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

  // Routing gate uses LOCAL JWT verification (getClaims) instead of the
  // network getUser(). getClaims verifies the access-token signature
  // against the project JWKS via WebCrypto — no Auth round-trip — which is
  // plenty for deciding redirect-vs-pass-through. The authoritative
  // network getUser() still runs in the RSC/data layer (auth-cache.ts),
  // so this removes one serialized auth leg per navigation with no
  // security loss. NOTE: getClaims still calls getSession() to read the
  // cookie, which is what triggers @supabase/ssr's cookie refresh, so the
  // session-handling contract above stays intact.
  const { data, error: authError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isAuthed = Boolean(claims?.sub);

  // If the JWT check failed but the user has a session cookie, don't kick
  // them out. This handles offline/network errors (JWKS fetch) and Safari
  // cookie quirks.
  if (authError && !isAuthed) {
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
  if (isAuthed && authRoutes.some((route) => pathname.startsWith(route))) {
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
    "/support",
    "/change-nickname",
    "/change-password",
    "/privacy",
    "/levels",
    "/admin",
  ];
  if (
    !isAuthed &&
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Skip middleware on anything that doesn't need a fresh auth check.
  //
  //   • `/api/*`         — route handlers self-auth and several are
  //                        deliberately public (e.g. recent-sightings).
  //   • `_next/static`   — chunks, fonts.
  //   • `_next/image`    — image optimizer.
  //   • `_next/data`     — Pages-router data; not used but stays excluded.
  //   • `favicon.ico`, `manifest.json`, `sw.js`, `offline.html` — public
  //     assets, never user-specific.
  //   • Static images by extension (svg/png/jpg/jpeg/gif/webp/ico).
  //
  // Every excluded request was previously firing supabase.auth.getUser()
  // for nothing. With this matcher, only real navigations + RSC fetches
  // pay the auth round-trip.
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon\\.ico|manifest\\.json|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
