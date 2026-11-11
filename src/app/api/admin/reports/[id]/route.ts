import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { resolveReport, resolveReportInput } from "@/lib/moderation/reports";
import { apiError, apiForbidden, apiNotFound, apiSuccess, apiUnauthorized, apiZodError, handleApiError } from "@/lib/utils/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return apiError("INVALID_PARAMS", "Invalid request");
    const parsed = resolveReportInput.safeParse({ ...body, reportId: id });
    if (!parsed.success) return apiZodError(parsed.error);
    const result = await resolveReport(session.user.id, parsed.data);
    if (result.outcome === "forbidden") return apiForbidden();
    if (result.outcome === "not_found") return apiNotFound("Report");
    if (result.outcome === "conflict") return apiError("CONFLICT", "This report was already resolved with a different decision.", 409);
    if (result.outcome === "invalid_note") return apiError("INVALID_PARAMS", "Please provide a resolution note.");
    const response = apiSuccess({ reportId: id, changed: result.outcome === "updated" });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) { return handleApiError(error); }
}
