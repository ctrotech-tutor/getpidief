import { auth } from "@/lib/auth/auth";
import AppLayout from "@/app/(app)/layout";
import Feed from "@/app/(app)/home/page";
import LandingPage from "./LandingPage";

// The root is personalized. Never statically cache one visitor's view for another.
export const dynamic = "force-dynamic";
export default async function RootPage({ searchParams }: { searchParams: Promise<{ view?: string; before?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return <LandingPage />;
  return <AppLayout><Feed searchParams={searchParams} /></AppLayout>;
}
