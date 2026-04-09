import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { documentsRepository } from "@/lib/db/repositories/documents";
import { apiSuccess, apiNotFound, apiForbidden, apiUnauthorized, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();

    // Try to find by slug first, then by ID
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!doc || doc.deletedAt) return apiNotFound("Document");
    return apiSuccess(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const { id }  = await params;
    const body    = await req.json();
    const userId  = session.user.id;
    const userRole= (session.user as any).role;

    const existing = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      columns: { authorId: true, status: true },
    });

    if (!existing) return apiNotFound("Document");

    const isOwner = existing.authorId === userId;
    const isAdmin = ["moderator", "admin", "super_admin"].includes(userRole);

    if (!isOwner && !isAdmin) return apiForbidden();

    const allowedFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.title)       allowedFields.title       = body.title;
    if (body.description) allowedFields.description = body.description;
    if (body.visibility)  allowedFields.visibility  = body.visibility;

    // Admins can change status
    if (isAdmin && body.status) {
      allowedFields.status = body.status;
    }

    await db.update(documents).set(allowedFields).where(eq(documents.id, id));
    await documentsRepository.invalidateCache(id);

    return apiSuccess({ updated: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const { id }   = await params;
    const userId   = session.user.id;
    const userRole = (session.user as any).role;

    const existing = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      columns: { authorId: true, fileUrl: true, status: true },
    });

    if (!existing) return apiNotFound("Document");

    const isOwner = existing.authorId === userId;
    const isAdmin = ["moderator", "admin", "super_admin"].includes(userRole);

    if (!isOwner && !isAdmin) return apiForbidden();

    // Soft delete — hard delete scheduled after 30 days by Inngest
    await db
      .update(documents)
      .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, id));

    await documentsRepository.invalidateCache(id);

    await inngest.send({
      name: "document/deleted",
      data: {
        documentId:       id,
        fileUrl:          existing.fileUrl,
        authorId:         existing.authorId,
        deletedByAdminId: isAdmin && !isOwner ? userId : null,
      },
    });

    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}