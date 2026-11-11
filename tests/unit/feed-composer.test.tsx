import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Composer } from "@/components/features/feed/Composer";
const m = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/app/(app)/home/actions", () => ({ createPost: m.create }));
describe("feed composer", () => {
  it("lets learners choose a question and submits actual content", async () => {
    m.create.mockResolvedValueOnce(undefined);
    render(<Composer name="Ada" />);
    fireEvent.change(screen.getByLabelText("Your post"), { target: { value: "How do you learn?" } });
    fireEvent.click(screen.getByRole("radio", { name: "Question" }));
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(m.create).toHaveBeenCalled());
    const submitted = m.create.mock.calls[0][0] as FormData;
    expect(submitted.get("kind")).toBe("question"); expect(submitted.get("body")).toBe("How do you learn?");
    expect(await screen.findByRole("status")).toHaveTextContent("published");
  });
  it("keeps the draft and shows errors if publishing fails", async () => {
    m.create.mockRejectedValueOnce(new Error("Please try again later."));
    render(<Composer name="Ada" />);
    fireEvent.change(screen.getByLabelText("Your post"), { target: { value: "A useful idea" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later.");
    expect(screen.getByLabelText("Your post")).toHaveValue("A useful idea");
  });
});
