import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), authenticated: true }));
vi.mock("@/hooks/useSession", () => ({ useSession: () => ({ isAuthenticated: mocks.authenticated }) }));
vi.mock("@/stores/index", () => ({ useUIStore: (selector: (state: object) => unknown) => selector({ addToast: mocks.toast, setShareModalDocumentId: vi.fn(), setReportModalDocumentId: vi.fn() }) }));
import { WorkstationActions } from "@/components/features/documents/WorkstationActions";

const renderActions = () => render(<WorkstationActions documentId="doc" initialLikeCount={0} initialDislikeCount={0} initialBookmarked={false} userReaction={null} />);
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); mocks.toast.mockReset(); mocks.authenticated = true; });

describe("resource save action", () => {
  it("reverts and reports a server error instead of claiming success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Save to library" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save to library" })).toBeInTheDocument());
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });
  it("saves and then removes a resource using the API", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetcher);
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Save to library" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Saved to library" })));
    fireEvent.click(screen.getByRole("button", { name: "Remove from library" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(fetcher.mock.calls[0][1].method).toBe("POST");
    expect(fetcher.mock.calls[1][1].method).toBe("DELETE");
  });
  it("asks a signed-out visitor to sign in", () => {
    mocks.authenticated = false;
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Save to library" }));
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sign in to save documents" }));
  });
  it("keeps the last confirmed reaction count after a later failure", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { likeCount: 1, dislikeCount: 0, userReaction: "like" } }) })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetcher);
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Like document (0)" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Like document (1)" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Dislike" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not update your reaction" })));
    expect(screen.getByRole("button", { name: "Like document (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dislike" })).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ reaction: "dislike" });
  });

});
