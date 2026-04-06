import { Text } from "@react-email/components";
import {
  BaseEmailLayout, EmailHeading, EmailBody,
  EmailButton, EmailDivider, EmailNote,
} from "./layouts/BaseLayout";

interface PasswordResetEmailProps {
  name:      string;
  token:     string;
  ipAddress: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me";

export function PasswordResetEmail({ name, token, ipAddress }: PasswordResetEmailProps) {
  const resetUrl  = `${APP_URL}/reset-password?token=${token}`;
  const firstName = name.split(" ")[0];

  return (
    <BaseEmailLayout
      preview={`${firstName}, reset your getpidief password. This link expires in 15 minutes.`}
      footerText="You received this because a password reset was requested for your account."
    >
      <EmailHeading>Reset your password.</EmailHeading>

      <EmailBody>
        Hi {firstName}, we received a request to reset the password for your
        getpidief account. Click the button below to choose a new password.
      </EmailBody>

      <EmailButton href={resetUrl}>
        Reset My Password
      </EmailButton>

      <EmailDivider />

      <Text style={{ color: "#8B9CC4", fontSize: "13px", margin: "0 0 8px" }}>
        Or copy this link:
      </Text>
      <Text
        style={{
          color:      "#60A5FA",
          fontSize:   "12px",
          wordBreak:  "break-all",
          fontFamily: "monospace",
          margin:     "0 0 16px",
        }}
      >
        {resetUrl}
      </Text>

      <EmailDivider />

      <Text style={{ color: "#4A5880", fontSize: "12px", lineHeight: "1.5", margin: 0 }}>
        ⏱ This link expires in <span style={{ color: "#F1F5F9" }}>15 minutes</span>.
      </Text>
      <Text style={{ color: "#4A5880", fontSize: "12px", lineHeight: "1.5", margin: "8px 0 0" }}>
        📍 Request originated from IP: {ipAddress}
      </Text>

      <EmailNote>
        If you didn't request this reset, you can safely ignore this email.
        Your password will not be changed.
      </EmailNote>
    </BaseEmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  name:      "Ada Lovelace",
  token:     "preview-reset-token-xyz789",
  ipAddress: "196.216.1.1",
} as PasswordResetEmailProps;