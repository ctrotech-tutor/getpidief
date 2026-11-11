import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { adminRepository } from "@/lib/db/repositories/admin";
import { apiSuccess, apiForbidden, handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user || !["moderator", "admin", "super_admin"].includes(role)) {
      return apiForbidden();
    }
    const stats = await adminRepository.getPlatformStats();
    return apiSuccess(stats);
  } catch (e) {
    return handleApiError(e);
  }
}
