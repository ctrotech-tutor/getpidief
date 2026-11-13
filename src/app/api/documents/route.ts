import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { withTransaction } from "@/lib/db/client";
import { documents, documentTags, documentUploads, tags, users } from "@/lib/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { uploadDocumentSchema } from "@/lib/validations/schemas";
import { inngest } from "@/lib/inngest/client";
import { apiCreated, apiError, apiUnauthorized, apiZodError, handleApiError } from "@/lib/utils/api";
import { sanitizeText } from "@/lib/utils/sanitize";
import { slugify } from "@/lib/utils/format";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const parsed = uploadDocumentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiZodError(parsed.error);
    const data = parsed.data;
    const userId = session.user.id;
    // Storage is currently potentially public. Do not promise private access.
    if (data.visibility !== "public") return apiError("UNSUPPORTED_VISIBILITY", "Restricted uploads are unavailable until private storage is configured.");
    const result = await withTransaction(async (tx) => {
      const [active] = await tx.select({ id: users.id }).from(users).where(and(
        eq(users.id, userId), eq(users.status, "active"), isNull(users.deletedAt),
      )).for("update");
      if (!active) return null;
      const [receipt] = await tx.select().from(documentUploads).where(and(
        eq(documentUploads.id, data.uploadId), eq(documentUploads.userId, userId),
        isNull(documentUploads.consumedAt), gt(documentUploads.expiresAt, sql`now()`),
      )).for("update");
      if (!receipt) return null;
      const [doc] = await tx.insert(documents).values({
        slug: `${slugify(data.title).slice(0, 120)}-${nanoid(8)}`,
        title: sanitizeText(data.title), description: data.description ? sanitizeText(data.description) : null,
        fileUrl: receipt.fileUrl, fileSize: receipt.fileSize, mimeType: "application/pdf",
        categoryId: data.categoryId, resourceType: data.resourceType, institutionId: data.institutionId,
        authorId: userId, academicYear: data.academicYear, semester: data.semester,
        language: data.language, visibility: "public", license: data.license,
        allowDownload: data.allowDownload, allowPrint: data.allowPrint, status: "pending", previewStatus: "pending",
      }).returning({ id: documents.id, slug: documents.slug });
      if (!doc) throw new Error("Failed to create document");
      // The current database does not yet enforce uniqueness on document_tags.
      // Resolve all inputs first: an ID and a name can refer to the same tag.
      const tagIds = new Set(data.tagIds ?? []);
      const namesBySlug = new Map<string, string>();
      for (const name of data.tagNames ?? []) {
        const slug = slugify(name);
        if (!namesBySlug.has(slug)) namesBySlug.set(slug, name);
      }
      // Lock existing tag rows in a consistent order across uploads.
      for (const [slug, name] of [...namesBySlug].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
        const [tag] = await tx.insert(tags).values({ name: sanitizeText(name), slug })
          .onConflictDoUpdate({ target: [tags.slug], set: { usageCount: sql`${tags.usageCount} + 1` } })
          .returning({ id: tags.id });
        if (tag) tagIds.add(tag.id);
      }
      if (tagIds.size) await tx.insert(documentTags).values(
        [...tagIds].map((tagId) => ({ documentId: doc.id, tagId }))
      ).onConflictDoNothing();
      await tx.update(documentUploads).set({ consumedAt: new Date(), documentId: doc.id }).where(eq(documentUploads.id, receipt.id));
      return { doc, fileUrl: receipt.fileUrl, fileSize: receipt.fileSize };
    });
    if (!result) return apiError("UPLOAD_UNAVAILABLE", "Upload is unavailable or expired. Please upload the file again.", 404);
    try {
      await inngest.send({ name: "document/uploaded", data: {
        documentId: result.doc.id, authorId: userId, fileUrl: result.fileUrl, fileSize: result.fileSize,
      } });
    } catch (error) { console.error("Document processing event failed", error); }
    return apiCreated({ documentId: result.doc.id, slug: result.doc.slug });
  } catch (error) { return handleApiError(error); }
}
