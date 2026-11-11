import type { Metadata } from "next";
import { FeedPreview } from "./preview";

export const metadata: Metadata = {
  title: "Feed preview | getpidief",
  description: "A working design preview of the getpidief study feed.",
  robots: { index: false, follow: false },
};

export default function FeedPreviewPage() {
  return <FeedPreview />;
}
