import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documents, users, documentReports } from "@/lib/db/schema";
import { eq, and, count, gte } from "drizzle-orm";
import { formatNumber } from "@/lib/utils/format";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();
  const admin   = session?.user as any;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parallel KPI queries
  const [
    totalDocs, pendingDocs, flaggedDocs, rejectedToday,
    totalUsers, activeToday,
    openReports,
  ] = await Promise.all([
    db.select({ count: count() }).from(documents).where(eq(documents.status, "approved")),
    db.select({ count: count() }).from(documents).where(eq(documents.status, "pending")),
    db.select({ count: count() }).from(documents).where(eq(documents.status, "flagged")),
    db.select({ count: count() }).from(documents).where(
      and(eq(documents.status, "rejected"), gte(documents.updatedAt, today))
    ),
    db.select({ count: count() }).from(users).where(eq(users.status, "active")),
    db.select({ count: count() }).from(users).where(gte(users.updatedAt, today)),
    db.select({ count: count() }).from(documentReports).where(eq(documentReports.status, "open")),
  ]);

  const kpis = [
    { label: "Approved Docs",   value: formatNumber(totalDocs[0]?.count ?? 0),   icon: "📄", color: "#2563EB", href: "/admin/moderation?status=approved" },
    { label: "Pending Review",  value: String(pendingDocs[0]?.count ?? 0),        icon: "⏳", color: "#F59E0B", href: "/admin/moderation?status=pending",  pulse: true },
    { label: "Flagged Docs",    value: String(flaggedDocs[0]?.count ?? 0),        icon: "🚩", color: "#EF4444", href: "/admin/moderation?status=flagged"  },
    { label: "Total Scholars",  value: formatNumber(totalUsers[0]?.count ?? 0),  icon: "👥", color: "#10B981", href: "/admin/users" },
    { label: "Open Reports",    value: String(openReports[0]?.count ?? 0),        icon: "📋", color: "#8B5CF6", href: "/admin/moderation?tab=reports" },
    { label: "Active Today",    value: String(activeToday[0]?.count ?? 0),        icon: "⚡", color: "#06B6D4", href: null },
  ];

  // Recent pending documents
  const recentPending = await db.query.documents.findMany({
    where: eq(documents.status, "pending"),
    orderBy: (d, { desc }) => [desc(d.createdAt)],
    limit: 8,
    with: {
      author: { columns: { id: true, username: true, displayName: true } },
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">
          Executive Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {(admin.displayName ?? admin.name ?? "Admin").split(" ")[0]}.
          Here's the platform at a glance.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const card = (
            <div
              key={kpi.label}
              className="bg-card border border-border rounded-2xl p-4 space-y-2
                         hover:border-ring/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{kpi.icon}</span>
                {kpi.pulse && kpi.value !== "0" && (
                  <span className="w-2 h-2 rounded-full bg-[var(--amber)] animate-pulse" />
                )}
              </div>
              <p className="text-2xl font-bold text-foreground" style={{ color: parseInt(kpi.value) > 0 && kpi.color !== "#2563EB" && kpi.color !== "#10B981" ? kpi.color : undefined }}>
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href}>{card}</Link>
          ) : (
            <div key={kpi.label}>{card}</div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-heading font-semibold text-foreground text-base mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/admin/moderation",  label: "Review Queue",         icon: "📋" },
            { href: "/admin/users",        label: "Manage Users",         icon: "👥" },
            { href: "/admin/analytics",    label: "View Analytics",       icon: "📊" },
            { href: "/admin/audit-logs",   label: "Audit Logs",           icon: "🔍" },
            { href: "/admin/infrastructure/universities", label: "Add University", icon: "🏛️" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border
                         bg-secondary text-sm font-medium text-foreground
                         hover:border-ring/40 hover:bg-secondary/80 transition-colors"
            >
              <span>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent pending */}
      {recentPending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-foreground text-base">
              Pending Review
              <span className="ml-2 text-xs font-normal text-[var(--amber)]">
                ({pendingDocs[0]?.count ?? 0})
              </span>
            </h2>
            <Link href="/admin/moderation" className="text-xs text-muted-foreground hover:text-primary">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentPending.map((doc) => (
              <div key={doc.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl
                           hover:border-ring/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[var(--amber)]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {(doc as any).author?.displayName} · {doc.resourceType?.replace("_", " ")}
                  </p>
                </div>
                <Link
                  href={`/admin/moderation?docId=${doc.id}`}
                  className="px-3 py-1.5 bg-[var(--amber)]/10 border border-[var(--amber)]/20
                             text-[var(--amber)] text-xs font-medium rounded-lg hover:bg-[var(--amber)]/20 transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
