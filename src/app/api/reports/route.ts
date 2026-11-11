import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documentReports, documents } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { documentReportSchema } from "@/lib/validations/schemas";
import { apiCreated, apiUnauthorized, apiZodError, apiError, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body   = await req.json();
    const parsed = documentReportSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const { documentId, reasons, additionalInfo } = parsed.data;
    const userId = session.user.id;

    // Verify document exists
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      columns: { id: true },
    });
    if (!doc) return apiError("NOT_FOUND", "Document not found", 404);

    // Insert report
    const [report] = await db
      .insert(documentReports)
      .values({
        documentId,
        reportedByUserId: userId,
        reasons,
        additionalInfo: additionalInfo ?? null,
        status: "open",
      })
      .onConflictDoNothing() // One report per user per document
      .returning({ id: documentReports.id });

    if (!report) {
      return apiError("CONFLICT", "You have already reported this document", 409);
    }

    // Increment document flag count
    await db.execute(
      sql`UPDATE documents SET flag_count = flag_count + 1 WHERE id = ${documentId}`
    );

    // Auto-flag if 3+ reports
    const flagCount = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM document_reports WHERE document_id = ${documentId} AND status = 'open'`
    );
    const count = parseInt(flagCount.rows[0]?.count ?? "0", 10);

    if (count >= 3) {
      await inngest.send({
        name: "document/flagged",
        data: { documentId, reportedByUserId: userId, reasons },
      });
    }

    return apiCreated({ reportId: report.id });
  } catch (e) {
    return handleApiError(e);
  }
}