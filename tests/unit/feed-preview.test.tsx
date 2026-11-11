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
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByText("What should I read next?")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("preview only");
  });

  it("opens and closes a resource dialog using the keyboard", () => {
    render(<FeedPreview />);
    fireEvent.click(screen.getByRole("button", { name: /Cell signalling, made a little clearer/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/secure PDF reader, page navigation/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("adds a local reply and keeps it when the discussion is reopened", () => {
    render(<FeedPreview />);
    fireEvent.click(screen.getByRole("button", { name: /23 replies/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Write a sample reply" }), { target: { value: "Try a substitution first." } });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(screen.getByText("Try a substitution first.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: /24 replies/ }));
    expect(screen.getByText("Try a substitution first.")).toBeInTheDocument();
  });

  it("shows only locally saved posts in the library view", () => {
    render(<FeedPreview />);
    fireEvent.click(screen.getAllByRole("button", { name: "Save to sample library" })[0]);
    fireEvent.click(screen.getByRole("link", { name: "Your library" }));
    expect(screen.getByRole("heading", { name: "Saved posts." })).toBeInTheDocument();
    expect(screen.getByText("Cell signalling, made a little clearer")).toBeInTheDocument();
    expect(screen.queryByText(/What finally made integration click/)).not.toBeInTheDocument();
  });

  it("follows and unfollows a sample author in the following feed", () => {
    render(<FeedPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Amara Ellis" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Follow" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("tab", { name: "Following" }));
    expect(screen.getByText("Reading between the lines")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Amara Ellis" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Following" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Reading between the lines")).not.toBeInTheDocument();
  });

  it("creates a sample question and labels it in the feed", () => {
    render(<FeedPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Question" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Write a sample post" }), { target: { value: "How do you revise for exams?" } });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByText("QUESTION")).toBeInTheDocument();
    expect(screen.getByText("How do you revise for exams?")).toBeInTheDocument();
  });

});
