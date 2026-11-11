import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { withTransaction } from "@/lib/db/client";
import { documentReports, documents, users } from "@/lib/db/schema";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { documentReportSchema } from "@/lib/validations/schemas";
import { apiCreated, apiUnauthorized, apiZodError, apiError, apiRateLimited, handleApiError } from "@/lib/utils/api";
import { rateLimiters } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import { sanitizeText } from "@/lib/utils/sanitize";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const parsed = documentReportSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiZodError(parsed.error);
    const userId = session.user.id;
    if (!(await rateLimiters.report.limit(userId)).success) return apiRateLimited();
    const { documentId, reasons, additionalInfo } = parsed.data;
    const result = await withTransaction(async (tx) => {
      const [actor] = await tx.select({ id: users.id }).from(users).where(and(
        eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt),
      )).for("update");
      if (!actor) return { outcome: "unavailable" as const };
      const [doc] = await tx.select({ id: documents.id }).from(documents).where(and(
        eq(documents.id, documentId), eq(documents.status, "approved"),
        eq(documents.visibility, "public"), isNull(documents.deletedAt),
      )).for("update");
      if (!doc) return { outcome: "unavailable" as const };
      const [report] = await tx.insert(documentReports).values({
        documentId, reportedByUserId: userId, reasons: [...new Set(reasons)],
        additionalInfo: additionalInfo ? sanitizeText(additionalInfo) : null, status: "open",
      }).onConflictDoNothing({ target: [documentReports.reportedByUserId, documentReports.documentId] }).returning({ id: documentReports.id });
      if (!report) return { outcome: "duplicate" as const };
      await tx.update(documents).set({ flagCount: sql`${documents.flagCount} + 1` }).where(eq(documents.id, documentId));
      const [open] = await tx.select({ count: count() }).from(documentReports).where(and(eq(documentReports.documentId, documentId), eq(documentReports.status, "open")));
      return { outcome: "created" as const, id: report.id, openCount: open?.count ?? 0 };
    });
    if (result.outcome === "unavailable") return apiError("NOT_FOUND", "Document not found", 404);
    if (result.outcome === "duplicate") return apiError("CONFLICT", "You have already reported this document", 409);
    if (result.openCount === 3) {
      try { await inngest.send({ name: "document/flagged", data: { documentId, reportedByUserId: userId, reasons } }); }
      catch (error) { console.error("Report event delivery failed", error); }
    }
    return apiCreated({ reportId: result.id });
  } catch (error) { return handleApiError(error); }
}
