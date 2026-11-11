import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { eq, gte, count, desc, sql } from "drizzle-orm";
import { formatNumber } from "@/lib/utils/format";

export default async function AdminAnalyticsPage() {
  const now       = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  const sevenAgo  = new Date(now.getTime() -  7 * 86400 * 1000);

  const [
    totalApproved, last30Days, last7Days,
    topDocuments,
  ] = await Promise.all([
    db.select({ count: count() }).from(documents).where(eq(documents.status, "approved")),
    db.select({ count: count() }).from(documents).where(
      sql`status = 'approved' AND published_at >= ${thirtyAgo}`
    ),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenAgo)),
    db.query.documents.findMany({
      where: eq(documents.status, "approved"),
      orderBy: [desc(documents.downloadCount)],
      limit: 10,
      columns: { id: true, slug: true, title: true, downloadCount: true, likeCount: true, viewCount: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform metrics and insights</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Approved Documents",    value: formatNumber(totalApproved[0]?.count ?? 0) },
          { label: "Published (30 days)",   value: formatNumber(last30Days[0]?.count ?? 0)    },
          { label: "New Users (7 days)",    value: formatNumber(last7Days[0]?.count ?? 0)     },
          { label: "Top Download Count",    value: formatNumber(topDocuments[0]?.downloadCount ?? 0) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Top documents */}
      <div>
        <h2 className="font-heading font-semibold text-foreground text-base mb-4">
          Top Documents by Downloads
        </h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                {["#", "Title", "Downloads", "Likes", "Views"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topDocuments.map((doc, i) => (
                <tr key={doc.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <a href={`/d/${doc.slug}`} target="_blank"
                       className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                      {doc.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{formatNumber(doc.downloadCount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatNumber(doc.likeCount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatNumber(doc.viewCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-secondary/30 text-center">
        <p className="text-sm text-muted-foreground">
          📊 Full chart analytics (recharts area/bar charts with daily granularity)
          render when Inngest has aggregated enough daily snapshot data.
          Charts are available after 7+ days of production data.
        </p>
      </div>
    </div>
  );
}
