import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton, EmailNote } from "./layouts/BaseLayout";

interface NewFollowerEmailProps {
  recipientName:   string;
  followerName:    string;
  followerUsername:string;
  followerDocCount:number;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me";

export function NewFollowerEmail({ recipientName, followerName, followerUsername, followerDocCount }: NewFollowerEmailProps) {
  const firstName = recipientName.split(" ")[0];
  return (
    <BaseEmailLayout
      preview={`${followerName} is now following you on getpidief.`}
      footerText="You received this because someone followed you on getpidief."
    >
      <EmailHeading>You have a new follower! 👤</EmailHeading>
      <EmailBody>
        Hi {firstName} - <strong style={{ color: "#F1F5F9" }}>{followerName}</strong> (@{followerUsername}) is now following your scholar profile.
        They'll be notified whenever you upload new resources.
        {followerDocCount > 0 && ` They've contributed ${followerDocCount} document${followerDocCount !== 1 ? "s" : ""} to the archive.`}
      </EmailBody>
      <EmailButton href={`${APP_URL}/u/${followerUsername}`}>
        View Their Profile →
      </EmailButton>
      <EmailNote>
        You're building a following. Keep contributing quality resources to grow your academic reputation.
      </EmailNote>
    </BaseEmailLayout>
  );
}

NewFollowerEmail.PreviewProps = {
  recipientName:    "Ada Lovelace",
  followerName:     "Charles Babbage",
  followerUsername: "cbabbage",
  followerDocCount: 12,
} as NewFollowerEmailProps;
