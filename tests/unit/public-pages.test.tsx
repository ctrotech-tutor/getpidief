import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PublicHeader, PublicFooter } from "@/components/public/PublicShell";
import AboutPage from "@/app/about/page";
import PrivacyPage from "@/app/privacy/page";
import CookiePage from "@/app/cookies/page";
import ContactPage from "@/app/contact/page";

afterEach(cleanup);
describe("public pages", () => {
  it("provides reachable public destinations in the mobile menu", () => {
    render(<PublicHeader />);
    const trigger = screen.getByLabelText("Navigation menu");
    const details = trigger.closest("details")!;
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(trigger);
    expect(details).toHaveAttribute("open");
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(nav).getByRole("link", { name: /our story/i })).toHaveAttribute("href", "/about");
    expect(within(nav).getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
    expect(within(nav).getByRole("link", { name: /create account/i })).toHaveAttribute("href", "/register");
  });
  it("links the shared footer to the legal pages and contact", () => {
    render(<PublicFooter />);
    for (const [label, href] of [["Privacy", "/privacy"], ["Terms", "/terms"], ["Cookies", "/cookies"], ["Get in touch", "/contact"]]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });
  it("describes the social vision without presenting the prototype as live", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("solo act");
    expect(screen.getByText(/sample content and interactions that don.t persist/i)).toBeInTheDocument();
  });
  it("marks the old policies for review and links to real section anchors", () => {
    const { unmount } = render(<PrivacyPage />);
    expect(screen.getByText(/has not yet been verified against the current service/i)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "On this page" });
    for (const link of within(nav).getAllByRole("link")) {
      expect(document.getElementById(link.getAttribute("href")!.slice(1))).not.toBeNull();
    }
    unmount();
    render(<CookiePage />);
    expect(screen.queryByRole("button", { name: /manage cookie preferences/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/you.ll see a cookie consent banner/i)).not.toBeInTheDocument();
  });
  it("offers mail links rather than a nonfunctional contact form", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: /support@getpidief.me/i })).toHaveAttribute("href", "mailto:support@getpidief.me");
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
  });
});
