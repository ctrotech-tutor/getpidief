import { Text } from "@react-email/components";
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton, EmailDivider, EmailNote } from "./layouts/BaseLayout";

interface BadgeEarnedEmailProps {
  recipientName: string;
  badgeName:     string;
  badgeDesc:     string;
  badgeIcon:     string;
  profileSlug:   string;
  pointsAwarded: number;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.com";

export function BadgeEarnedEmail({
  recipientName, badgeName, badgeDesc, badgeIcon, profileSlug, pointsAwarded,
}: BadgeEarnedEmailProps) {
  const firstName = recipientName.split(" ")[0];
  return (
    <BaseEmailLayout
      preview={`🏅 You earned the "${badgeName}" badge on getpidief!`}
      footerText="You received this because you earned an achievement on getpidief."
    >
      {/* Badge icon */}
      <div style={{ textAlign: "center", margin: "0 0 24px" }}>
        <div style={{
          display:         "inline-flex",
          alignItems:      "center",
          justifyContent:  "center",
          width:           "72px",
          height:          "72px",
          borderRadius:    "20px",
          background:      "rgba(245,158,11,0.12)",
          border:          "1px solid rgba(245,158,11,0.25)",
          fontSize:        "32px",
        }}>
          {badgeIcon}
        </div>
      </div>

      <EmailHeading>You earned a badge! 🏅</EmailHeading>
      <EmailBody>
        Congratulations, {firstName}! You've unlocked a new achievement on getpidief.
      </EmailBody>

      <Text style={{
        textAlign:   "center",
        color:       "#F59E0B",
        fontSize:    "20px",
        fontWeight:  700,
        margin:      "0 0 8px",
        letterSpacing: "-0.02em",
      }}>
        {badgeName}
      </Text>
      <Text style={{ textAlign: "center", color: "#8B9CC4", fontSize: "14px", margin: "0 0 20px" }}>
        {badgeDesc}
      </Text>

      {pointsAwarded > 0 && (
        <Text style={{
          textAlign:   "center",
          color:       "#F1F5F9",
          fontSize:    "13px",
          margin:      "0 0 24px",
          background:  "rgba(37,99,235,0.1)",
          padding:     "8px 16px",
          borderRadius:"999px",
          display:     "inline-block",
        }}>
          +{pointsAwarded} reputation points awarded
        </Text>
      )}

      <EmailButton href={`${APP_URL}/u/${profileSlug}`}>
        View Your Profile →
      </EmailButton>

      <EmailDivider />
      <EmailNote>
        Keep contributing quality resources to unlock more badges and climb the reputation leaderboard.
      </EmailNote>
    </BaseEmailLayout>
  );
}

BadgeEarnedEmail.PreviewProps = {
  recipientName: "Ada Lovelace",
  badgeName:     "First Upload",
  badgeDesc:     "Uploaded your first document to the archive",
  badgeIcon:     "📄",
  profileSlug:   "ada-lovelace",
  pointsAwarded: 10,
} as BadgeEarnedEmailProps;
