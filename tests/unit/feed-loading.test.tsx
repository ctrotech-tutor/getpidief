import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FeedLoading } from "@/components/features/feed/FeedLoading";
import HomeLoading from "@/app/(app)/home/loading";

describe("feed loading", () => {
  it("announces loading once without presenting placeholders as real content or controls", () => {
    render(<FeedLoading />);
    const status = screen.getByRole("status", { name: "Loading feed" });
    expect(within(status).getByText("Loading feed…")).toBeInTheDocument();
    expect(within(status).queryAllByRole("link")).toHaveLength(0);
    expect(within(status).queryAllByRole("button")).toHaveLength(0);
    expect(within(status).queryAllByRole("article")).toHaveLength(0);
  });
  it("uses the same placeholder for the home route", () => {
    render(<HomeLoading />);
    expect(screen.getByRole("status", { name: "Loading feed" })).toBeInTheDocument();
  });
});
