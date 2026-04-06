import { Text } from "@react-email/components";
import {
  BaseEmailLayout, EmailHeading, EmailBody,
  EmailButton, EmailDivider, EmailNote,
} from "./layouts/BaseLayout";

interface VerificationEmailProps {
  name:  string;
  token: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.com";

export function VerificationEmail({ name, token }: VerificationEmailProps) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  const firstName = name.split(" ")[0];

  return (
    <BaseEmailLayout
      preview={`${firstName}, verify your getpidief email address to activate your account.`}
      footerText="You received this because you created a getpidief account."
    >
      <EmailHeading>Verify your email address.</EmailHeading>

      <EmailBody>
        Hi {firstName}, click the button below to verify your email address
        and activate your getpidief account.
      </EmailBody>

      <EmailButton href={verifyUrl}>
        Verify Email Address
      </EmailButton>

      <EmailDivider />

      <Text style={{ color: "#8B9CC4", fontSize: "13px", margin: "0 0 8px" }}>
        Or copy this link into your browser:
      </Text>
      <Text
        style={{
          color:          "#60A5FA",
          fontSize:       "12px",
          wordBreak:      "break-all",
          fontFamily:     "monospace",
          margin:         "0 0 16px",
        }}
      >
        {verifyUrl}
      </Text>

      <EmailNote>
        This link expires in 24 hours. If you didn't create an account,
        you can safely ignore this email.
      </EmailNote>
    </BaseEmailLayout>
  );
}

VerificationEmail.PreviewProps = {
  name:  "Ada Lovelace",
  token: "preview-token-abc123",
} as VerificationEmailProps;