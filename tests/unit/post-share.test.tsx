import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostShare } from "@/components/features/feed/PostShare";
const postId = "12345678-1234-1234-1234-123456789abc";
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("post sharing", () => {
  it("uses the native share sheet with a link to the discussion", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    render(<PostShare postId={postId} author="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Share post by Ada" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: "Post by Ada", url: `${window.location.origin}/home/post/${postId}` }));
  });
  it("copies when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<PostShare postId={postId} author="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Share post by Ada" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Link copied");
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/home/post/${postId}`);
  });
  it("offers a selectable link when sharing and clipboard are unavailable", async () => {
    vi.stubGlobal("navigator", {});
    render(<PostShare postId={postId} author="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Share post by Ada" }));
    expect(await screen.findByRole("textbox", { name: "Post link to copy" })).toHaveValue(`${window.location.origin}/home/post/${postId}`);
  });
  it("does not report failure if native sharing was cancelled", async () => {
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")) });
    render(<PostShare postId={postId} author="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "Share post by Ada" }));
    await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
  });
});
