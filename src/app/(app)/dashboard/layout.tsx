import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/layouts/DashboardSidebar";
import type { SessionUser } from "@/hooks/useSession";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sidebarUser: SessionUser & { documentCount?: number; followerCount?: number } =
    session.user as SessionUser & { documentCount?: number; followerCount?: number };

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex gap-6">
        <aside className="hidden lg:block w-56 shrink-0">
          <DashboardSidebar
            user={{
              id: sidebarUser.id,
              username: sidebarUser.username,
              displayName: sidebarUser.displayName ?? sidebarUser.name ?? "Scholar",
              avatarUrl: sidebarUser.avatarUrl ?? sidebarUser.image,
              reputationScore: sidebarUser.reputationScore ?? 0,
              reputationLevel: sidebarUser.reputationLevel ?? "scholar",
              institutionId: sidebarUser.institutionId ?? null,
              documentCount: sidebarUser.documentCount ?? 0,
              followerCount: sidebarUser.followerCount ?? 0,
            }}
          />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}