import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils/format";

interface PageProps {
  searchParams: Promise<{ action?: string; page?: string }>;
}

const ACTION_ICONS: Record<string, string> = {
  document_approved: "✅", document_rejected: "❌", document_deleted: "🗑️",
  user_role_changed: "🔄", user_suspended: "🔒", user_reinstated: "🔓",
  settings_updated: "⚙️", institution_created: "🏛️", category_created: "📂",
  default: "📋",
};

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const action = params.action ?? "";
  const page   = parseInt(params.page ?? "1", 10);
  const limit  = 25;
  const offset = (page - 1) * limit;

  const [logs, totalResult] = await Promise.all([
    db.query.auditLogs.findMany({
      where: action ? eq(auditLogs.action, action as any) : undefined,
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset,
      with: {
        admin: { columns: { id: true, username: true, displayName: true } },
      },
    }),
    db.select({ count: count() }).from(auditLogs),
  ]);

  const total      = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} total entries</p>
      </div>

      {/* Filter */}
      <form method="GET" className="flex gap-3">
        <select name="action" defaultValue={action}
          className="h-10 px-3 text-sm bg-secondary border border-border rounded-xl text-foreground outline-none">
          <option value="">All actions</option>
          {Object.keys(ACTION_ICONS).filter((k) => k !== "default").map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button type="submit" className="px-4 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium">Filter</button>
      </form>

      {/* Table */}
      <div className="space-y-2">
        {logs.map((log) => {
          const icon = ACTION_ICONS[log.action] ?? ACTION_ICONS.default;
          return (
            <div key={log.id} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
              <span className="text-base shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {log.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  by {(log as any).admin?.displayName ?? "System"} ·{" "}
                  {log.entityType}/{log.entityId?.slice(0, 8)}…
                </p>
                {log.afterState && typeof log.afterState === "object" ? (
                  <p className="text-xs text-muted-foreground font-mono">
                    {JSON.stringify(log.afterState)}
                  </p>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.createdAt)}</span>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No audit logs found.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/admin/audit-logs?page=${p}${action ? `&action=${action}` : ""}`}
               className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center ${p === page ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
