import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SeenHistorySettings } from "@/components/features/feed/SeenHistorySettings";
import { readSeen, recordSeen } from "@/lib/feed/seen-posts";
const id = "12345678-1234-1234-1234-123456789abc";
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
describe("feed history privacy setting", () => {
  it("clears only this account’s local history and saved return position", () => {
    recordSeen("ada", id); recordSeen("other", id);
    sessionStorage.setItem("feed-return-v1:ada", "saved");
    render(<SeenHistorySettings userId="ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Clear feed history" }));
    expect(screen.getByRole("status")).toHaveTextContent("cleared");
    expect(readSeen("ada")).toEqual([]); expect(readSeen("other")).toHaveLength(1);
    expect(sessionStorage.getItem("feed-return-v1:ada")).toBeNull();
  });
  it("reports failure instead of claiming storage was cleared", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => { throw new Error("denied"); });
    render(<SeenHistorySettings userId="ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Clear feed history" }));
    expect(screen.getByRole("status")).toHaveTextContent("Could not clear");
    vi.restoreAllMocks();
  });
});
