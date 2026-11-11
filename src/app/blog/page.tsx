import type { Metadata } from "next";
import { ComingSoon } from "@/components/public/ComingSoon";
export const metadata: Metadata = { title: "Stories | getpidief", description: "Stories from getpidief." };
export default function BlogPage() { return <ComingSoon label="STORIES" title="More to come." description="This space is for stories and ideas from getpidief. There are no published articles here yet." />; }
