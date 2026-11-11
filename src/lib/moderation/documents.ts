import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { withTransaction } from "@/lib/db/client";
import { auditLogs, documents, users } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";

export const moderationInput = z.object({
  documentId: z.string().uuid(),
  action: z.enum(["approve", "reject", "flag"]),
  rejectionReason: z.enum(["low_quality", "copyright", "duplicate", "inappropriate", "wrong_metadata", "not_academic"]).optional(),
  rejectionNote: z.string().trim().max(500).optional(),
}).strict().refine((value) => value.action !== "reject" || !!value.rejectionReason, {
  message: "A rejection reason is required", path: ["rejectionReason"],
});
export type ModerationInput = z.infer<typeof moderationInput>;

// Both the server action and API use this service; UI routing is not authorization.
export async function moderateDocument(userId: string, input: ModerationInput) {
  const result = await withTransaction(async (tx) => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(and(
      eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt),
    )).for("update");
    if (!actor || !["moderator", "admin", "super_admin"].includes(actor.role)) return { outcome: "forbidden" as const };
    const [doc] = await tx.select({ status: documents.status }).from(documents).where(and(
      eq(documents.id, input.documentId), isNull(documents.deletedAt),
    )).for("update");
    if (!doc || doc.status === "deleted") return { outcome: "not_found" as const };
    const status = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "flagged";
    if (doc.status === status) return { outcome: "unchanged" as const };
    await tx.update(documents).set({
      status, publishedAt: input.action === "approve" ? new Date() : undefined,
      rejectionReasons: input.action === "reject" ? [input.rejectionReason!] : undefined,
      moderatedByAdminId: userId, moderatedAt: new Date(), updatedAt: new Date(),
    }).where(eq(documents.id, input.documentId));
    await tx.insert(auditLogs).values({
      adminId: userId,
      action: input.action === "approve" ? "document_approved" : input.action === "reject" ? "document_rejected" : "document_metadata_edited",
      entityType: "document", entityId: input.documentId,
      beforeState: { status: doc.status }, afterState: { status, moderationAction: input.action },
      reason: input.action === "reject" ? input.rejectionReason : null,
    });
    return { outcome: "updated" as const };
  });
  if (result.outcome === "updated") {
    try {
      if (input.action === "approve") await inngest.send({ name: "document/approved", data: { documentId: input.documentId, moderatorId: userId } });
      if (input.action === "reject") await inngest.send({ name: "document/rejected", data: { documentId: input.documentId, moderatorId: userId, reason: input.rejectionReason!, note: input.rejectionNote } });
    } catch (error) { console.error("Moderation event delivery failed", error); }
  }
  return result;
}
