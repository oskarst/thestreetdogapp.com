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
