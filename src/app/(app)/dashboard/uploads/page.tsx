import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { documentsRepository } from "@/lib/db/repositories/documents";
import Link from "next/link";
import { formatDate, formatNumber } from "@/lib/utils/format";

const STATUS_CONFIG = {
  approved: { label: "Live",      bg: "bg-(--emerald-subtle)", text: "text-(--emerald)" },
  pending:  { label: "In Review", bg: "bg-(--amber-subtle)",   text: "text-(--amber)"   },
  rejected: { label: "Rejected",  bg: "bg-destructive/10",          text: "text-destructive"       },
  draft:    { label: "Draft",     bg: "bg-secondary",               text: "text-muted-foreground"  },
  flagged:  { label: "Flagged",   bg: "bg-destructive/10",          text: "text-destructive"       },
  deleted:  { label: "Deleted",   bg: "bg-secondary",               text: "text-muted-foreground"  },
} as const;

export default async function UploadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  type StatusFilter = keyof typeof STATUS_CONFIG;
  const rawStatus = params.status;
  const status: StatusFilter | undefined =
    rawStatus &&
    rawStatus !== "all" &&
    rawStatus in STATUS_CONFIG
      ? (rawStatus as StatusFilter)
      : undefined;
  const page   = parseInt(params.page ?? "1", 10);

  const { documents, total, totalPages } = await documentsRepository.getByAuthor(
    session.user.id,
    { status, page, limit: 15 }
  );

  const tabs = ["all", "approved", "pending", "rejected", "draft"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-foreground text-xl tracking-tight">My Uploads</h1>
          <p className="text-sm text-muted-foreground">{total} total document{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/uploads/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground
                     text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Upload New
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={tab === "all" ? "/dashboard/uploads" : `/dashboard/uploads?status=${tab}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              (tab === "all" && !status) || status === tab
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </div>

      {/* Table */}
      {documents.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary border border-border
                          flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-muted-foreground" aria-hidden>
              <rect x="5" y="3" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M9 9h10M9 13h10M9 17h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-medium text-foreground">No uploads yet</p>
          <p className="text-sm text-muted-foreground">Start contributing to the archive.</p>
          <Link
            href="/dashboard/uploads/new"
            className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            Upload your first document
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Uploaded</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Downloads</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc) => {
                const s = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
                return (
                  <tr key={doc.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground line-clamp-1 max-w-65">
                        {doc.status === "approved" ? (
                          <Link href={`/d/${doc.slug}`} className="hover:text-primary transition-colors">
                            {doc.title}
                          </Link>
                        ) : doc.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {doc.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right text-muted-foreground">
                      {formatNumber(doc.downloadCount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={doc.status === "approved" ? `/d/${doc.slug}` : "#"}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/dashboard/uploads?page=${p}${status ? `&status=${status}` : ""}`}
              className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center font-medium transition-colors ${
                p === page ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
