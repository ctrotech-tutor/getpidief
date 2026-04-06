import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiCreated<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, string[]>
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

export function apiUnauthorized(message = "Authentication required") {
  return apiError("UNAUTHORIZED", message, 401);
}

export function apiForbidden(message = "Access denied") {
  return apiError("FORBIDDEN", message, 403);
}

export function apiNotFound(resource = "Resource") {
  return apiError("NOT_FOUND", `${resource} not found`, 404);
}

export function apiRateLimited(message = "Too many requests. Please slow down.") {
  return apiError("RATE_LIMITED", message, 429);
}

export function apiServerError(message = "An unexpected error occurred") {
  return apiError("INTERNAL_ERROR", message, 500);
}

/** Parse a Zod error into our API error format */
export function apiZodError(error: ZodError) {
  return apiError(
    "VALIDATION_ERROR",
    "Invalid request data",
    400,
    error.flatten().fieldErrors as Record<string, string[]>
  );
}

/** Handle any thrown error in an API route */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) return apiZodError(error);

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return apiUnauthorized();
    if (error.message === "FORBIDDEN")    return apiForbidden();
    if (error.message === "NOT_FOUND")    return apiNotFound();
  }

  console.error("[API Error]", error);
  return apiServerError();
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION RESULT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; field?: string };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError(error: string, field?: string): ActionResult<never> {
  return { success: false, error, field };
}