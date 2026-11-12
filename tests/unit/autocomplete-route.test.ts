import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), autocomplete: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/search/search", () => ({ getAutocomplete: mocks.autocomplete }));
import { GET } from "@/app/api/search/autocomplete/route";
describe("autocomplete response privacy", () => {
  it("does not publicly cache personal suggestions", async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.autocomplete.mockResolvedValue([{ type: 'recent', label: 'personal search' }]);
    const response = await GET(new NextRequest('http://example.test/api/search/autocomplete?q=personal'));
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.autocomplete).toHaveBeenCalledWith('personal', 'user-1', 8);
    expect((await response.json()).data[0].label).toBe('personal search');
  });
  it("also marks short responses non-cacheable", async () => {
    const response = await GET(new NextRequest('http://example.test/api/search/autocomplete?q=a'));
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
