import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/nav/top-nav";
import { BottomTabs } from "@/components/nav/bottom-tabs";
import { FloatingAddButton } from "@/components/nav/floating-add-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, role")
    .eq("id", user.id)
    .single();

  const userData = {
    id: user.id,
    email: user.email ?? "",
    nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "User",
    role: (profile?.role ?? "user") as "user" | "rescuer" | "admin",
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav user={userData} />
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>
      <BottomTabs />
      <FloatingAddButton />
    </div>
  );
}
