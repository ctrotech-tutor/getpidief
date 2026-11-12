import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { PeopleRail } from "@/components/features/feed/PeopleRail";
import { finishFollow, startFollow } from "@/components/features/feed/follow-updates";
vi.mock("@/app/(app)/home/actions", () => ({ toggleSave: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
describe("people rail", () => {
  it("updates the rail independently after a successful follow", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ following: { total: 1, following: [{ id: "ada", username: "ada", displayName: "Ada", avatarUrl: null }] }, suggestions: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<PeopleRail initial={{ following: { total: 0, following: [] }, suggestions: [] }} />);
    act(() => { startFollow("ada", true); finishFollow("ada", true); });
    await waitFor(() => expect(screen.getByRole("link", { name: /Ada/ })).toHaveAttribute("href", "/u/ada"));
    expect(fetchMock).toHaveBeenCalledWith("/api/feed/people", expect.objectContaining({ cache: "no-store" }));
  });
  it("does not refresh after a failed follow", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    render(<PeopleRail initial={{ following: { total: 0, following: [] }, suggestions: [] }} />);
    act(() => { startFollow("ada", true); finishFollow("ada", false, true); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
