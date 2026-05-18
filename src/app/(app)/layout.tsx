import { redirect } from "next/navigation";
import { TopNav } from "@/components/nav/top-nav";
import { BottomTabs } from "@/components/nav/bottom-tabs";
import { StickyAddDogButton } from "@/components/nav/sticky-add-dog-button";
import { AuthListener } from "@/components/auth/auth-listener";
import { PrecachePages } from "@/components/pwa/sw-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";
import { getUserSightings } from "@/lib/db/sightings";
import { deriveStreak, shortHexId } from "@/lib/dashboard";
import { time } from "@/lib/perf";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const layoutStart = performance.now();
  const [user, profile] = await time("layout.auth+profile", () =>
    Promise.all([getCurrentUser(), getCurrentProfile()])
  );

  if (!user) redirect("/login");

  // Streak + shortId surface in TopNav on every screen. Sightings is one
  // RPC call (get_my_sightings) so this stays cheap.
  const sightings = await time("layout.sightings", () =>
    getUserSightings(user.id).catch(() => [])
  );
  const streakDays = deriveStreak(sightings);
  const shortId = shortHexId(user.id);
  console.log(
    `[perf] layout.total = ${Math.round(performance.now() - layoutStart)}ms`
  );

  const userData = {
    id: user.id,
    email: user.email ?? "",
    nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "User",
    role: (profile?.role ?? "user") as "user" | "rescuer" | "admin",
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AuthListener />
      <PrecachePages />
      <TopNav user={userData} shortId={shortId} streakDays={streakDays} />
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-36">{children}</main>
      <StickyAddDogButton />
      <BottomTabs />
    </div>
  );
}
