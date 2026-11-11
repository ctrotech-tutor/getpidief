import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { withTransaction } from "@/lib/db/client";
import { auditLogs, documentReports, documents, users } from "@/lib/db/schema";
import { sanitizeText } from "@/lib/utils/sanitize";

export const resolveReportInput = z.object({
  reportId: z.string().uuid(),
  documentId: z.string().uuid(),
  decision: z.enum(["actioned", "dismissed"]),
  note: z.string().trim().min(3).max(500),
}).strict();
export type ResolveReportInput = z.infer<typeof resolveReportInput>;

// Resolution records a review decision only. Resource status is changed separately.
export async function resolveReport(userId: string, input: ResolveReportInput) {
  const note = sanitizeText(input.note).trim();
  if (note.length < 3) return { outcome: "invalid_note" as const };
  return withTransaction(async (tx) => {
    // Lock ordering matches document moderation and report creation: actor, document, report.
    const [actor] = await tx.select({ role: users.role }).from(users).where(and(
      eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt),
    )).for("update");
    if (!actor || !["moderator", "admin", "super_admin"].includes(actor.role)) return { outcome: "forbidden" as const };
    const [doc] = await tx.select({ id: documents.id }).from(documents)
      .where(eq(documents.id, input.documentId)).for("update");
    if (!doc) return { outcome: "not_found" as const };
    const [report] = await tx.select({ status: documentReports.status }).from(documentReports).where(and(
      eq(documentReports.id, input.reportId), eq(documentReports.documentId, input.documentId),
    )).for("update");
    if (!report) return { outcome: "not_found" as const };
    const status = input.decision === "actioned" ? "resolved_actioned" : "resolved_dismissed";
    if (report.status === status) return { outcome: "unchanged" as const };
    if (report.status !== "open" && report.status !== "under_review") return { outcome: "conflict" as const };
    const now = new Date();
    await tx.update(documentReports).set({ status, resolutionNote: note, resolvedByAdminId: userId, resolvedAt: now })
      .where(eq(documentReports.id, input.reportId));
    await tx.insert(auditLogs).values({
      adminId: userId, action: "report_resolved", entityType: "document_report", entityId: input.reportId,
      beforeState: { status: report.status }, afterState: { status, documentId: input.documentId }, reason: note,
    });
    return { outcome: "updated" as const };
  });
}
