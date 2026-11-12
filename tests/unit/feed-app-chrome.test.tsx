import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
const routing = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => routing.path }));
vi.mock("@/components/layouts/TopNav", () => ({ TopNav: () => <div>Application top navigation</div> }));
vi.mock("@/components/layouts/MobileBottomTabs", () => ({ MobileBottomTabs: () => <div>Mobile navigation</div> }));
vi.mock("@/components/layouts/CommandPalette", () => ({ CommandPalette: () => <div>Command palette</div> }));
import { AppChrome } from "@/components/layouts/AppChrome";

describe("feed application chrome", () => {
  it.each(["/", "/home"])("keeps the feed navigation without the separate top bar at %s", (path) => {
    routing.path = path;
    render(<AppChrome><div>Feed content</div></AppChrome>);
    expect(screen.queryByText("Application top navigation")).not.toBeInTheDocument();
    expect(screen.getByText("Mobile navigation")).toBeInTheDocument();
    expect(screen.getByText("Feed content")).toBeInTheDocument();
  });
  it.each(["/explore", "/home/post/123", "/settings"])("keeps the existing application navigation at %s", (path) => {
    routing.path = path;
    render(<AppChrome><div>Other page</div></AppChrome>);
    expect(screen.getByText("Application top navigation")).toBeInTheDocument();
    expect(screen.getByText("Mobile navigation")).toBeInTheDocument();
  });
});
