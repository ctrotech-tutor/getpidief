import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// Admin pages must never be prerendered without the request-scoped session.
export const dynamic = "force-dynamic";

const ADMIN_NAV = [
  { href: "/admin/dashboard",    label: "Executive Dashboard", icon: "📊" },
  { href: "/admin/feed-reports", label: "Feed Reports", icon: "💬" },
  { href: "/admin/moderation",   label: "Moderation Queue",    icon: "📋", badge: "pending" },
  { href: "/admin/users",        label: "User Management",     icon: "👥" },
  { href: "/admin/analytics",    label: "Analytics",           icon: "📈" },
  { href: "/admin/audit-logs",   label: "Audit Logs",          icon: "🔍" },
  { href: "/admin/settings",     label: "System Settings",     icon: "⚙️" },
  null,
  { href: "/admin/infrastructure/universities", label: "Universities", icon: "🏛️" },
  { href: "/admin/infrastructure/categories",   label: "Categories",   icon: "📂" },
  { href: "/admin/infrastructure/tags",         label: "Tags",         icon: "🏷️" },
  { href: "/admin/infrastructure/course-codes", label: "Course Codes", icon: "📖" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (!["moderator", "admin", "super_admin"].includes(role)) {
    redirect("/explore");
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-background/95 sticky top-0 h-screen
                        overflow-y-auto flex flex-col">
        {/* Logo + badge */}
        <div className="px-4 py-5 border-b border-border">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="font-heading font-black text-lg text-foreground tracking-tight">
              getpidief
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[var(--gold)]/15 border border-[var(--gold)]/30
                             text-[var(--gold)] text-[10px] font-bold tracking-wider uppercase">
              ADMIN
            </span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{role.replace("_", " ")}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {ADMIN_NAV.map((item, i) => {
            if (!item) return <div key={`div-${i}`} className="h-px bg-border my-3" />;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                           text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="px-3 py-4 border-t border-border">
          <Link
            href="/explore"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground
                       hover:text-foreground hover:bg-secondary transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
