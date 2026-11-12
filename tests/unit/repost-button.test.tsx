import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const m = vi.hoisted(() => ({ setRepost: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("@/app/(app)/home/actions", () => ({ setRepost: m.setRepost }));
import { RepostButton } from "@/components/features/feed/RepostButton";
afterEach(() => vi.clearAllMocks());
describe("reposting", () => {
  it("creates and then undoes an attributed repost", async () => {
    m.setRepost.mockResolvedValue(undefined);
    render(<RepostButton postId="post-id" author="Ada" initiallyReposted={false} count={3} />);
    fireEvent.click(screen.getByRole("button", { name: "Repost post by Ada" }));
    const undo = await screen.findByRole("button", { name: "Undo repost of post by Ada" });
    expect(undo).toHaveAttribute("aria-pressed", "true"); expect(undo).toHaveTextContent("4");
    expect((m.setRepost.mock.calls[0][0] as FormData).get("repost")).toBe("true");
    fireEvent.click(undo);
    await waitFor(() => expect(screen.getByRole("button", { name: "Repost post by Ada" })).toHaveTextContent("3"));
    expect((m.setRepost.mock.calls[1][0] as FormData).get("repost")).toBe("false");
  });
  it("does not pretend a failed request succeeded", async () => {
    m.setRepost.mockRejectedValueOnce(new Error("unavailable"));
    render(<RepostButton postId="post-id" author="Ada" initiallyReposted={false} count={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Repost post by Ada" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not update repost");
    expect(screen.getByRole("button", { name: "Repost post by Ada" })).toHaveAttribute("aria-pressed", "false");
  });
});
