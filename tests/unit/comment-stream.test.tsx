import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/hooks/useSession", () => ({ useSession: () => ({ isAuthenticated: true, user: { id: "u1", displayName: "Reader", avatarUrl: null } }) }));
import { CommentStream } from "@/components/features/comments/CommentStream";

const item = { id: "c1", userId: "u2", content: "What do you think?", createdAt: "2026-01-01T00:00:00Z", isEdited: false, helpfulCount: 0, replyCount: 4, parentId: null, user: { id: "u2", username: "anna", displayName: "Anna", avatarUrl: null }, replies: [] };
const ok = (comments: unknown[], hasMore = false) => ({ ok: true, json: async () => ({ data: { comments, hasMore } }) });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("real discussion UI", () => {
  it("shows a retry instead of an empty discussion on a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(ok([])));
    render(<CommentStream documentId="doc" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
    expect(screen.queryByText("No discussion yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No discussion yet.")).toBeInTheDocument();
  });
  it("keeps the draft and explains failure when posting fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok([])).mockResolvedValueOnce({ ok: false }));
    render(<CommentStream documentId="doc" />);
    await screen.findByText("No discussion yet.");
    fireEvent.change(screen.getByRole("textbox", { name: "Write a comment" }), { target: { value: "My question" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not post");
    expect(screen.getByRole("textbox", { name: "Write a comment" })).toHaveValue("My question");
  });
  it("fetches replies beyond the first preview and posts a reply", async () => {
    const reply = { ...item, id: "r1", parentId: "c1", content: "A reply", replyCount: 0 };
    const fetcher = vi.fn().mockResolvedValueOnce(ok([item])).mockResolvedValueOnce(ok([reply])).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(ok([item]));
    vi.stubGlobal("fetch", fetcher);
    render(<CommentStream documentId="doc" />);
    fireEvent.click(await screen.findByRole("button", { name: "View all replies" }));
    expect(await screen.findByText("A reply")).toBeInTheDocument();
    expect(fetcher.mock.calls[1][0]).toContain("parentId=c1");
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Write a reply" }), { target: { value: "Thanks!" } });
    fireEvent.click(screen.getByRole("button", { name: "Post reply" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({ parentId: "c1", content: "Thanks!" });
  });
  it("keeps an edit draft if saving fails", async () => {
    const own = { ...item, userId: "u1", replyCount: 0 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok([own])).mockResolvedValueOnce({ ok: false }));
    render(<CommentStream documentId="doc" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Edit comment" }), { target: { value: "Updated idea" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not update");
    expect(screen.getByRole("textbox", { name: "Edit comment" })).toHaveValue("Updated idea");
  });
  it("marks a helpful vote only after server confirmation", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(ok([item])).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { outcome: "voted", helpfulCount: 1 } }) });
    vi.stubGlobal("fetch", fetcher);
    render(<CommentStream documentId="doc" />);
    fireEvent.click(await screen.findByRole("button", { name: "Helpful (0)" }));
    expect(await screen.findByRole("button", { name: "Marked helpful (1)" })).toBeDisabled();
  });
  it("renders an anonymized deleted parent and retains its replies", async () => {
    const reply = { ...item, id: "reply", parentId: "c1", content: "Still here", replyCount: 0 };
    const deleted = { ...item, user: null, userId: null, isDeleted: true, content: "[deleted]", replyCount: 1, replies: [reply] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok([deleted])));
    render(<CommentStream documentId="doc" />);
    expect(await screen.findByText("Deleted comment")).toBeInTheDocument();
    expect(screen.getByText("Still here")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Anna" })).toHaveLength(1);
  });

});
