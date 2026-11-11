import { Text } from "@react-email/components";
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton, EmailDivider, EmailNote } from "./layouts/BaseLayout";

interface DocumentRejectedEmailProps {
  contributorName:  string;
  documentTitle:    string;
  rejectionReason:  string;
  rejectionNote?:   string;
}

const REASON_LABELS: Record<string, string> = {
  low_quality:     "Low quality or illegible scan",
  copyright:       "Possible copyright violation",
  duplicate:       "Duplicate of an existing document",
  inappropriate:   "Inappropriate content",
  wrong_metadata:  "Incorrect or missing metadata",
  not_academic:    "Does not appear to be academic content",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.com";

export function DocumentRejectedEmail({ contributorName, documentTitle, rejectionReason, rejectionNote }: DocumentRejectedEmailProps) {
  const firstName = contributorName.split(" ")[0];
  const reasonLabel = REASON_LABELS[rejectionReason] ?? rejectionReason.replace(/_/g, " ");

  return (
    <BaseEmailLayout
      preview={`Your document "${documentTitle}" needs attention before it can be published.`}
      footerText="You received this because you uploaded a document on getpidief."
    >
      <EmailHeading>Document needs attention.</EmailHeading>
      <EmailBody>
        Hi {firstName} — your submission has been reviewed and requires some changes before it can be published.
      </EmailBody>
      <Text style={{ color: "#F1F5F9", fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>
        "{documentTitle}"
      </Text>
      <Text style={{ color: "#8B9CC4", fontSize: "14px", margin: "0 0 20px" }}>
        <strong style={{ color: "#F1F5F9" }}>Reason:</strong> {reasonLabel}
        {rejectionNote && (
          <><br /><em>Note: {rejectionNote}</em></>
        )}
      </Text>
      <EmailButton href={`${APP_URL}/dashboard/uploads`}>
        Review and Resubmit →
      </EmailButton>
      <EmailDivider />
      <EmailNote>
        You can edit your submission and resubmit from your uploads dashboard.
        If you believe this was an error, please contact support.
      </EmailNote>
    </BaseEmailLayout>
  );
}

DocumentRejectedEmail.PreviewProps = {
  contributorName: "Ada Lovelace",
  documentTitle:   "CS301 Notes",
  rejectionReason: "low_quality",
  rejectionNote:   "Pages 3–7 are not legible",
} as DocumentRejectedEmailProps;
