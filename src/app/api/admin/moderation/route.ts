import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documents, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiForbidden, apiError, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";
// import { revalidatePath } from "next/cache";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user?.id || !["moderator", "admin", "super_admin"].includes(role)) {
      return apiForbidden();
    }

    const body   = await req.json();
    const { documentId, action, rejectionReason, rejectionNote } = body;

    if (!documentId || !["approve", "reject", "flag"].includes(action)) {
      return apiError("INVALID_PARAMS", "Invalid action or documentId");
    }

    const statusMap: Record<string, string> = {
      approve: "approved",
      reject:  "rejected",
      flag:    "flagged",
    };

    await db.update(documents).set({
      status:          statusMap[action] as any,
      publishedAt:     action === "approve" ? new Date() : undefined,
      rejectionReasons: action === "reject" ? [rejectionReason] : undefined,
      moderatedByAdminId: session.user.id,
      moderatedAt:     new Date(),
      updatedAt:       new Date(),
    }).where(eq(documents.id, documentId));

    await db.insert(auditLogs).values({
      adminId:    session.user.id,
      action:     `document_${action}d` as any,
      entityType: "document",
      entityId:   documentId,
      afterState: { status: statusMap[action], reason: rejectionReason },
    });

    if (action === "approve") {
      await inngest.send({ name: "document/approved", data: { documentId, moderatorId: session.user.id } });
    } else if (action === "reject") {
      await inngest.send({ name: "document/rejected", data: { documentId, moderatorId: session.user.id, reason: rejectionReason, note: rejectionNote } });
    }

    return apiSuccess({ action, documentId });
  } catch (e) {
    return handleApiError(e);
  }
}
