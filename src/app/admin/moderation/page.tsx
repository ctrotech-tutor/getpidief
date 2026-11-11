import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documents, users, documentReports } from "@/lib/db/schema";
import { eq, desc, count, and, isNull, inArray, sql } from "drizzle-orm";
import { formatDate, formatFileSize } from "@/lib/utils/format";
import { revalidatePath } from "next/cache";
import { RESOURCE_TYPE_LABELS } from "@/types/index";
import Link from "next/link";
import { moderateDocument, moderationInput } from "@/lib/moderation/documents";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

const STATUS_TABS = [
  { value: "pending",  label: "Pending",  color: "text-[var(--amber)]"   },
  { value: "approved", label: "Approved", color: "text-[var(--emerald)]" },
  { value: "rejected", label: "Rejected", color: "text-destructive"       },
  { value: "flagged",  label: "Flagged",  color: "text-[var(--amber)]"   },
  { value: "reported", label: "Reported", color: "text-[var(--amber)]" },
];

const REJECTION_REASONS = [
  { value: "low_quality",         label: "Low quality / illegible scan" },
  { value: "copyright",           label: "Copyright violation"           },
  { value: "duplicate",           label: "Duplicate submission"          },
  { value: "inappropriate",       label: "Inappropriate content"         },
  { value: "wrong_metadata",      label: "Incorrect metadata"            },
  { value: "not_academic",        label: "Not academic content"          },
];

export default async function ModerationPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const actor = await db.query.users.findFirst({
    where: and(eq(users.id, session.user.id), eq(users.status, "active"), isNull(users.deletedAt)),
    columns: { role: true },
  });
  if (!actor || !["moderator", "admin", "super_admin"].includes(actor.role)) redirect("/explore");
  const params = await searchParams;
  const status = (["pending", "approved", "rejected", "flagged", "reported"] as const).find((s) => s === params.status) ?? "pending";
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10000) : 1;
  const limit = 15;
  const offset = (page - 1) * limit;

  const filter = status === "reported"
    ? and(isNull(documents.deletedAt), sql`exists (select 1 from document_reports r where r.document_id = ${documents.id} and r.status = 'open')`)
    : and(eq(documents.status, status), isNull(documents.deletedAt));
  const [docs, totalResult] = await Promise.all([
    db.query.documents.findMany({
      where: filter,
      orderBy: [desc(documents.createdAt)],
      limit,
      offset,
      with: {
        author:   { columns: { id: true, username: true, displayName: true, verificationStatus: true } },
        category: { columns: { id: true, name: true, color: true } },
        institution: { columns: { id: true, name: true } },
      },
    }),
    db.select({ count: count() }).from(documents).where(filter),
  ]);

  const reports = status === "reported" && docs.length
    ? await db.select({ documentId: documentReports.documentId, reasons: documentReports.reasons,
        additionalInfo: documentReports.additionalInfo, createdAt: documentReports.createdAt })
      .from(documentReports).where(and(inArray(documentReports.documentId, docs.map((doc) => doc.id)), eq(documentReports.status, "open")))
      .orderBy(desc(documentReports.createdAt)).limit(100)
    : [];

  const total      = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Server actions are independently authenticated and authorized in the service.
  async function approveDocument(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const input = moderationInput.parse({ documentId: formData.get("docId"), action: "approve" });
    const result = await moderateDocument(session.user.id, input);
    if (result.outcome === "forbidden" || result.outcome === "not_found") throw new Error("Action unavailable");
    revalidatePath("/admin/moderation");
  }

  async function rejectDocument(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const input = moderationInput.parse({ documentId: formData.get("docId"), action: "reject",
      rejectionReason: formData.get("rejectionReason"), rejectionNote: formData.get("rejectionNote") || undefined });
    const result = await moderateDocument(session.user.id, input);
    if (result.outcome === "forbidden" || result.outcome === "not_found") throw new Error("Action unavailable");
    revalidatePath("/admin/moderation");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Moderation Queue</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} documents in this view</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/moderation?status=${tab.value}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              status === tab.value
                ? `border-primary ${tab.color}`
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Documents */}
      {docs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">✅ Queue is clear!</p>
          <p className="text-sm mt-1">No {status} documents at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const typeLabel = RESOURCE_TYPE_LABELS[doc.resourceType as keyof typeof RESOURCE_TYPE_LABELS] ?? doc.resourceType;
            const catColor  = (doc as any).category?.color ?? "#6B7280";
            return (
              <div key={doc.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4 justify-between flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}
                      >
                        {typeLabel}
                      </span>
                      {(doc as any).category && (
                        <span className="text-xs text-muted-foreground">{(doc as any).category.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
                    </div>
                    <h3 className="font-semibold text-foreground">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>by {(doc as any).author?.displayName}</span>
                      {(doc as any).institution && <span>· {(doc as any).institution.name}</span>}
                      {doc.fileSize && <span>· {formatFileSize(doc.fileSize)}</span>}
                      {doc.pageCount && <span>· {doc.pageCount} pages</span>}
                    </div>
                  </div>

                  {/* Preview link */}
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground
                               hover:text-foreground hover:border-ring/40 transition-colors shrink-0"
                  >
                    Preview PDF ↗
                  </a>
                </div>

                {status === "reported" && (
                  <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium">Recent open reports</p>
                    {reports.filter((report) => report.documentId === doc.id).map((report, index) => (
                      <div key={index} className="text-muted-foreground">
                        <p>{report.reasons.join(", ").replaceAll("_", " ")}</p>
                        {report.additionalInfo && <p>{report.additionalInfo}</p>}
                        <p className="text-xs">{formatDate(report.createdAt)}</p>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">Showing up to 100 recent reports across this page. Report resolution is not available yet.</p>
                  </div>
                )}
                {/* Approve / Reject actions */}
                {(status === "pending" || status === "reported" || status === "flagged") && (
                  <div className="flex items-start gap-3 pt-3 border-t border-border flex-wrap">
                    {/* Approve */}
                    <form action={approveDocument}>
                      <input type="hidden" name="docId" value={doc.id} />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 bg-[var(--emerald)]/10
                                   border border-[var(--emerald)]/20 text-[var(--emerald)] text-sm font-medium
                                   rounded-xl hover:bg-[var(--emerald)]/20 transition-colors"
                      >
                        ✓ Approve
                      </button>
                    </form>

                    {/* Reject */}
                    <form action={rejectDocument} className="flex items-center gap-2 flex-wrap">
                      <input type="hidden" name="docId" value={doc.id} />
                      <select
                        name="rejectionReason"
                        required
                        className="h-9 px-2 text-xs bg-secondary border border-border rounded-lg
                                   text-foreground outline-none focus:border-ring"
                      >
                        <option value="">Select reason…</option>
                        {REJECTION_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="rejectionNote"
                        placeholder="Optional note…"
                        className="h-9 px-3 text-xs bg-secondary border border-border rounded-lg
                                   text-foreground placeholder:text-muted-foreground outline-none
                                   focus:border-ring w-48"
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 bg-destructive/10
                                   border border-destructive/20 text-destructive text-sm font-medium
                                   rounded-xl hover:bg-destructive/20 transition-colors"
                      >
                        ✕ Reject
                      </button>
                    </form>
                  </div>
                )}

                {/* Rejected: show reason */}
                {status === "rejected" && doc.rejectionReasons && (
                  <div className="px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground">
                    <span className="font-medium text-destructive">Rejection reason:</span> {doc.rejectionReasons}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10000) }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((p) => (
            <Link
              key={p}
              href={`/admin/moderation?status=${status}&page=${p}`}
              className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center ${
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
