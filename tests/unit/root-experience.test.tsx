import { describe, expect, it, vi } from "vitest";
import { Suspense } from "react";
import { FeedLoading } from "@/components/features/feed/FeedLoading";
const m = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/app/(app)/layout", () => ({ default: () => null }));
vi.mock("@/app/(app)/home/page", () => ({ default: () => null }));
vi.mock("@/app/LandingPage", () => ({ default: () => null }));
import RootPage from "@/app/page";
import AppLayout from "@/app/(app)/layout";
import LandingPage from "@/app/LandingPage";
import Feed from "@/app/(app)/home/page";
describe("root experience", () => {
  const searchParams = Promise.resolve({ view: "saved" });
  it("shows the landing page when the server session is absent or revoked", async () => {
    m.auth.mockResolvedValueOnce(null);
    const result = await RootPage({ searchParams });
    expect(result.type).toBe(LandingPage);
  });
  it("shows the protected feed at the same root URL for a signed-in user", async () => {
    m.auth.mockResolvedValueOnce({ user: { id: "user" } });
    const result = await RootPage({ searchParams });
    expect(result.type).toBe(AppLayout);
    expect(result.props.children.type).toBe(Suspense);
    expect(result.props.children.props.fallback.type).toBe(FeedLoading);
    expect(result.props.children.props.children.type).toBe(Feed);
    expect(result.props.children.props.children.props.searchParams).toBe(searchParams);
  });
});
