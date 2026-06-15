import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/nav/top-nav";
import { AppFooter } from "@/components/nav/app-footer";
import { NavProgress } from "@/components/nav/nav-progress";
import { AuthListener } from "@/components/auth/auth-listener";
import { PrecachePages } from "@/components/pwa/sw-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { LocationGate } from "@/components/location/location-gate";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";
import { getViewerMissionAccess } from "@/lib/viewer-city";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cheap auth gate only — getCurrentUser() is the (cache()'d) round-trip
  // children already pay. We deliberately do NOT await getCurrentProfile()
  // here: the profile RPC used to serialize ahead of the page's heavy
  // parallel RPCs. It's now resolved inside <TopNavWithProfile> behind a
  // Suspense boundary so the nav (which renders nickname/role) loads in
  // parallel with children instead of blocking them.
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const access = await getViewerMissionAccess();

  return (
    <LocationGate initialCitySlug={access.city?.slug ?? null}>
    <div className="flex flex-col min-h-screen">
      {/* NavProgress reads useSearchParams which Next requires to live
          inside a Suspense boundary at the layout level. */}
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <AuthListener />
      <PrecachePages />
      <Suspense fallback={<TopNav user={fallbackUser(user)} />}>
        <TopNavWithProfile user={user} />
      </Suspense>
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-36">{children}</main>
      <AppFooter />
    </div>
    </LocationGate>
  );
}

/** Nav data we can render immediately from the auth user, before the
 *  profile RPC resolves (Suspense fallback). */
function fallbackUser(user: { id: string; email?: string }) {
  return {
    id: user.id,
    email: user.email ?? "",
    nickname: user.email?.split("@")[0] ?? "User",
    role: "user" as "user" | "rescuer" | "admin",
  };
}

/** Resolves the profile in parallel with the page's children (it sits in
 *  its own Suspense boundary) and renders the nav with nickname/role. */
async function TopNavWithProfile({
  user,
}: {
  user: { id: string; email?: string };
}) {
  const profile = await getCurrentProfile();

  const userData = {
    id: user.id,
    email: user.email ?? "",
    nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "User",
    role: (profile?.role ?? "user") as "user" | "rescuer" | "admin",
  };

  return <TopNav user={userData} />;
}
