import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { server } from "./mocks/server";

// ── MSW lifecycle ─────────────────────────────────────────────────────────────
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

// ── Global env mocks ──────────────────────────────────────────────────────────
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
vi.stubEnv("NEXTAUTH_SECRET",     "2c415fa6720ac9b4573b09961c8efeff473112384c55aff35335c7ec56865e05");
vi.stubEnv("NEXTAUTH_URL",        "http://localhost:3000");

// ── Next.js navigation mocks ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter:      () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname:    () => "/",
  useSearchParams:() => new URLSearchParams(),
  redirect:       vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers:  () => ({ get: () => null }),
  cookies:  () => ({ get: () => null, set: vi.fn() }),
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth/auth", () => ({
  auth:            vi.fn(() => Promise.resolve(null)),
  getCurrentUser:  vi.fn(() => Promise.resolve(null)),
  requireAuth:     vi.fn(() => Promise.resolve("test-user-id")),
  requireRole:     vi.fn(() => Promise.resolve({ id: "test-user-id", role: "admin" })),
  signIn:          vi.fn(),
  signOut:         vi.fn(),
}));
