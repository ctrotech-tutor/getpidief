import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Composer } from "@/components/features/feed/Composer";
const m = vi.hoisted(() => ({ create: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/(app)/home/actions", () => ({ createPost: m.create }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
describe("feed composer", () => {
  beforeEach(() => vi.clearAllMocks());
  it("opens a focused dialog and publishes real content", async () => {
    m.create.mockResolvedValueOnce(undefined);
    render(<Composer name="Ada" avatarUrl="/ada.jpg" />);
    expect(screen.queryByLabelText("Your post")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "What’s on your mind?" }));
    expect(screen.getByRole("dialog", { name: "Create a post" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your post")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your post"), { target: { value: "How do you learn?" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(m.create).toHaveBeenCalledTimes(1));
    const submitted = m.create.mock.calls[0][0] as FormData;
    expect(submitted.get("kind")).toBe("thought"); expect(submitted.get("body")).toBe("How do you learn?");
    expect(await screen.findByRole("status")).toHaveTextContent("published");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(m.refresh).toHaveBeenCalled();
  });
  it("keeps the draft and shows errors if publishing fails", async () => {
    m.create.mockRejectedValueOnce(new Error("Please try again later."));
    render(<Composer name="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "What’s on your mind?" }));
    fireEvent.change(screen.getByLabelText("Your post"), { target: { value: "A useful idea" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later.");
    expect(screen.getByLabelText("Your post")).toHaveValue("A useful idea");
  });
  it("grows with input and limits typed or pasted text to 280 Unicode code points", () => {
    render(<Composer name="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "What’s on your mind?" }));
    const input = screen.getByLabelText("Your post") as HTMLTextAreaElement;
    Object.defineProperty(input, "scrollHeight", { configurable: true, value: 230 });
    fireEvent.change(input, { target: { value: "😀".repeat(281) } });
    expect(input.value).toBe("😀".repeat(280));
    expect(input.style.height).toBe("230px");
    expect(screen.getByLabelText("280 of 280 characters")).toBeInTheDocument();
    Object.defineProperty(input, "scrollHeight", { configurable: true, value: 160 });
    fireEvent.change(input, { target: { value: "Short" } });
    expect(input.style.height).toBe("160px");
    expect(screen.getByLabelText("5 of 280 characters")).toBeInTheDocument();
  });
  it("keeps an unfinished draft when closed and reopened", async () => {
    render(<Composer name="Ada" />);
    fireEvent.click(screen.getByRole("button", { name: "What’s on your mind?" }));
    fireEvent.change(screen.getByLabelText("Your post"), { target: { value: "Draft idea" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "What’s on your mind?" }));
    expect(screen.getByLabelText("Your post")).toHaveValue("Draft idea");
    expect(m.create).not.toHaveBeenCalled();
  });
});
