import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FeedPreview } from "@/app/feed-preview/preview";

afterEach(cleanup);

describe("study feed preview", () => {
  it("filters the sample feed and explains an empty result", () => {
    render(<FeedPreview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search sample posts" }), { target: { value: "cell signalling" } });
    expect(screen.getByText("Cell signalling, made a little clearer")).toBeInTheDocument();
    expect(screen.queryByText(/What finally made integration click/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search sample posts" }), { target: { value: "no matching sample" } });
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("keeps sample posts local and updates the visible feed", () => {
    render(<FeedPreview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Write a sample post" }), { target: { value: "What should I read next?" } });
    fireEvent.click(screen.getByRole("button", { name: /Post/ }));
    expect(screen.getByText("What should I read next?")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("preview only");
  });

  it("opens and closes a resource dialog using the keyboard", () => {
    render(<FeedPreview />);
    fireEvent.click(screen.getByRole("button", { name: /Cell signalling, made a little clearer/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/reader and replies are not connected/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
