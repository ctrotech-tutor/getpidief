import type { Metadata } from "next";
import { ComingSoon } from "@/components/public/ComingSoon";
export const metadata: Metadata = { title: "Updates | getpidief", description: "Updates from getpidief." };
export default function ChangelogPage() { return <ComingSoon label="UPDATES" title="A work in progress." description="We’re building getpidief thoughtfully. A public record of product updates will live here when it is ready." />; }
