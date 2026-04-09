import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documents, documentTags, tags } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { uploadDocumentSchema } from "@/lib/validations/schemas";
import { inngest } from "@/lib/inngest/client";
import { apiSuccess, apiCreated, apiUnauthorized, apiZodError, handleApiError } from "@/lib/utils/api";
import { sanitizeText } from "@/lib/utils/sanitize";
import { slugify } from "@/lib/utils/format";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body   = await req.json();
    const parsed = uploadDocumentSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const data   = parsed.data;
    const userId = session.user.id;

    // Generate unique slug
    const baseSlug = slugify(data.title).slice(0, 120);
    const slug     = `${baseSlug}-${nanoid(8)}`;

    // Sanitize user input
    const cleanTitle       = sanitizeText(data.title);
    const cleanDescription = data.description ? sanitizeText(data.description) : null;

    // Insert document
    const [doc] = await db
      .insert(documents)
      .values({
        slug,
        title:         cleanTitle,
        description:   cleanDescription,
        fileUrl:       data.fileUrl,
        fileSize:      data.fileSize,
        mimeType:      "application/pdf",
        categoryId:    data.categoryId,
        resourceType:  data.resourceType,
        institutionId: data.institutionId,
        authorId:      userId,
        academicYear:  data.academicYear,
        semester:      data.semester as any,
        language:      data.language,
        visibility:    data.visibility,
        license:       data.license,
        allowDownload: data.allowDownload,
        allowPrint:    data.allowPrint,
        status:        "pending",
        previewStatus: "pending",
      })
      .returning({ id: documents.id, slug: documents.slug });

    if (!doc) throw new Error("Failed to create document");

    // Insert tags
    if (data.tagIds?.length) {
      await db.insert(documentTags).values(
        data.tagIds.map((tagId) => ({ documentId: doc.id, tagId }))
      ).onConflictDoNothing();
    }

    // Create new tags if provided
    if (data.tagNames?.length) {
      for (const name of data.tagNames) {
        const tagSlug  = slugify(name);
        const [newTag] = await db
          .insert(tags)
          .values({ name: sanitizeText(name), slug: tagSlug })
          .onConflictDoUpdate({
            target:  [tags.slug],
            set:     { usageCount: sql`usage_count + 1` },
          })
          .returning({ id: tags.id });

        if (newTag) {
          await db.insert(documentTags)
            .values({ documentId: doc.id, tagId: newTag.id })
            .onConflictDoNothing();
        }
      }
    }

    // Trigger processing pipeline
    await inngest.send({
      name: "document/uploaded",
      data: {
        documentId: doc.id,
        authorId:   userId,
        fileUrl:    data.fileUrl,
        fileSize:   data.fileSize,
      },
    });

    return apiCreated({ documentId: doc.id, slug: doc.slug });
  } catch (e) {
    return handleApiError(e);
  }
}