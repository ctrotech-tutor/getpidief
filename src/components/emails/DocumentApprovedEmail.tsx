import { Text } from "@react-email/components";
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton, EmailDivider, EmailNote } from "./layouts/BaseLayout";

interface DocumentApprovedEmailProps {
  contributorName: string;
  documentTitle:   string;
  documentSlug:    string;
  downloadCount?:  number;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.com";

export function DocumentApprovedEmail({ contributorName, documentTitle, documentSlug }: DocumentApprovedEmailProps) {
  const docUrl    = `${APP_URL}/d/${documentSlug}`;
  const firstName = contributorName.split(" ")[0];

  return (
    <BaseEmailLayout
      preview={`✅ Your document "${documentTitle}" is now live on getpidief.`}
      footerText="You received this because you uploaded a document on getpidief."
    >
      <EmailHeading>Your document is live. ✅</EmailHeading>
      <EmailBody>
        Hi {firstName} - your contribution has been reviewed and approved.
        It's now searchable and accessible to scholars worldwide.
      </EmailBody>
      <Text style={{ color: "#60A5FA", fontSize: "15px", fontWeight: 600, margin: "0 0 20px" }}>
        "{documentTitle}"
      </Text>
      <EmailButton href={docUrl}>View Your Document →</EmailButton>
      <EmailDivider />
      <EmailNote>
        Share it with your classmates and earn reputation as others download and engage with it.
      </EmailNote>
    </BaseEmailLayout>
  );
}

DocumentApprovedEmail.PreviewProps = {
  contributorName: "Ada Lovelace",
  documentTitle:   "CS301 Advanced Algorithms Past Exam 2023",
  documentSlug:    "cs301-advanced-algorithms-past-exam-2023-abc123",
} as DocumentApprovedEmailProps;
