import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClickablePost } from "@/components/features/feed/ClickablePost";
const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("clickable post", () => {
  it("opens non-interactive areas without hijacking controls, modified clicks, or selected text", () => {
    mocks.push.mockClear();
    render(<ClickablePost postId="post-1"><span>Post space</span><button>Like</button><a href="/u/ada">Ada</a><input aria-label="Post link to copy" /></ClickablePost>);
    fireEvent.click(screen.getByText("Post space"));
    expect(mocks.push).toHaveBeenCalledWith("/home/post/post-1");
    mocks.push.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Like" }));
    fireEvent.click(screen.getByRole("link", { name: "Ada" }));
    fireEvent.click(screen.getByLabelText("Post link to copy"));
    fireEvent.click(screen.getByText("Post space"), { ctrlKey: true });
    const selection = vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "selected text" } as Selection);
    fireEvent.click(screen.getByText("Post space"));
    expect(mocks.push).not.toHaveBeenCalled();
    selection.mockRestore();
  });
});
