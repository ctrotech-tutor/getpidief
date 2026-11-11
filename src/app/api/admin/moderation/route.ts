import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { moderateDocument, moderationInput } from "@/lib/moderation/documents";
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, apiZodError, handleApiError } from "@/lib/utils/api";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const parsed = moderationInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return apiZodError(parsed.error);
    const result = await moderateDocument(session.user.id, parsed.data);
    if (result.outcome === "forbidden") return apiForbidden();
    if (result.outcome === "not_found") return apiNotFound("Document");
    return apiSuccess({ action: parsed.data.action, documentId: parsed.data.documentId, changed: result.outcome === "updated" });
  } catch (error) { return handleApiError(error); }
}
