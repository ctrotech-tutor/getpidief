import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getInterestChoices } from "@/lib/interests/server";
import { InterestTagsStep } from "@/components/features/auth/InterestTagsStep";

export default async function InterestSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { choices, selected } = await getInterestChoices(session.user.id);
  return <><h2 className="text-xl font-semibold">Your interests</h2><p className="mt-2 mb-6 text-sm text-muted-foreground">Keep a list of topics you care about. The home feed is currently ordered by newest posts, not personalized by topic.</p><InterestTagsStep allTags={choices} initialSelected={selected} settings /></>;
}
