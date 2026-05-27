import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/nav/top-nav";
import { AppFooter } from "@/components/nav/app-footer";
import { NavProgress } from "@/components/nav/nav-progress";
import { AuthListener } from "@/components/auth/auth-listener";
import { PrecachePages } from "@/components/pwa/sw-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth-cache";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) redirect("/login");

  const userData = {
    id: user.id,
    email: user.email ?? "",
    nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "User",
    role: (profile?.role ?? "user") as "user" | "rescuer" | "admin",
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* NavProgress reads useSearchParams which Next requires to live
          inside a Suspense boundary at the layout level. */}
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <AuthListener />
      <PrecachePages />
      <TopNav user={userData} />
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-36">{children}</main>
      <AppFooter />
    </div>
  );
}
