import { afterEach, describe, expect, it, vi } from "vitest";
import { getRor, searchRor } from "@/lib/institutions/ror";

const record = {
  id: "https://ror.org/03xrrjk67", status: "active", types: ["education"],
  names: [{ value: "University of Example", types: ["ror_display"] }],
  locations: [{ geonames_details: { country_code: "NG", country_name: "Nigeria" } }],
};
afterEach(() => vi.unstubAllGlobals());
describe("ROR institution directory", () => {
  it("uses the fixed HTTPS v2 endpoint and filters invalid records", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [record, { ...record, status: "inactive" }, { ...record, types: ["company"] }] }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchRor("Example & Co")).toEqual([{ id: "03xrrjk67", name: "University of Example", country: "Nigeria", countryCode: "NG" }]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin).toBe("https://api.ror.org");
    expect(url.searchParams.get("query")).toBe("Example & Co");
    expect(url.searchParams.get("filter")).toBe("types:education");
  });
  it("rejects malformed identifiers without a network request", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await getRor("../../evil.example")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("validates the authoritative record and status at selection time", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => record }).mockResolvedValueOnce({ ok: true, json: async () => ({ ...record, status: "withdrawn" }) });
    vi.stubGlobal("fetch", fetchMock);
    expect((await getRor("03xrrjk67"))?.name).toBe("University of Example");
    expect(await getRor("03xrrjk67")).toBeNull();
  });
  it("surfaces directory outages to enable a local fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(searchRor("example")).rejects.toThrow("unavailable");
  });
});
