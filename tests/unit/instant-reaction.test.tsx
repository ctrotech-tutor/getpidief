import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
const actions = vi.hoisted(() => ({ toggleLike: vi.fn(), setRepost: vi.fn() }));
vi.mock("@/app/(app)/home/actions", () => actions);
import { InstantReaction } from "@/components/features/feed/InstantReaction";
afterEach(() => vi.clearAllMocks());
describe("instant feed reactions", () => {
  it("updates repeated posts immediately, prevents concurrent writes and rolls back on failure", async () => {
    let reject!: (reason: Error) => void;
    actions.toggleLike.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    render(<><InstantReaction kind="like" postId="one" author="Ada" initialActive={false} count={2} /><InstantReaction kind="like" postId="one" author="Ada" initialActive={false} count={2} /></>);
    fireEvent.click(screen.getAllByRole("button", { name: "Like post by Ada" })[0]);
    const buttons = screen.getAllByRole("button", { name: "Unlike post by Ada" });
    expect(buttons).toHaveLength(2); expect(buttons[0]).toHaveTextContent("3");
    fireEvent.click(buttons[1]); expect(actions.toggleLike).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error("failed")));
    expect(screen.getAllByRole("button", { name: "Like post by Ada" })[0]).toHaveTextContent("2");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
  it("allows another change after a successful write", async () => {
    actions.toggleLike.mockResolvedValue(undefined);
    render(<InstantReaction kind="like" postId="two" author="Ada" initialActive={false} count={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Like post by Ada" }));
    const unlike = screen.getByRole("button", { name: "Unlike post by Ada" });
    await waitFor(() => expect(unlike).toHaveAttribute("aria-disabled", "false"));
    fireEvent.click(unlike);
    await waitFor(() => expect(actions.toggleLike).toHaveBeenCalledTimes(2));
    expect((actions.toggleLike.mock.calls[1][0] as FormData).get("active")).toBe("true");
  });
});
