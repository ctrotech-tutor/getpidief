import { render } from "@react-email/render";

// Import email components
import { DocumentApprovedEmail } from "@/components/emails/DocumentApprovedEmail";
import { DocumentRejectedEmail } from "@/components/emails/DocumentRejectedEmail";
import { BadgeEarnedEmail } from "@/components/emails/BadgeEarnedEmail";
import { NewFollowerEmail } from "@/components/emails/NewFollowerEmail";

interface EmailData {
  name: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

export async function getEmailTemplate(
  type: string,
  data: EmailData
): Promise<{ subject: string; html: string } | null> {
  // Convert React email components to HTML strings
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me";
  
  switch (type) {
    case "document_approved": {
      const html = await render(
        DocumentApprovedEmail({
          contributorName: data.name,
          documentTitle: data.metadata.documentTitle as string,
          documentSlug: data.metadata.documentSlug as string,
          downloadCount: data.metadata.downloadCount as number,
        })
      );
      return {
        subject: `✅ Your document is approved — ${data.metadata.documentTitle}`,
        html,
      };
    }
      
    case "document_rejected": {
      const html = await render(
        DocumentRejectedEmail({
          contributorName: data.name,
          documentTitle: data.metadata.documentTitle as string,
          rejectionReason: data.metadata.rejectionReason as string,
        })
      );
      return {
        subject: `Document not approved — action required`,
        html,
      };
    }
      
    case "badge_earned": {
      const html = await render(
        BadgeEarnedEmail({
          recipientName: data.name,
          badgeName: data.metadata.badgeName as string,
          badgeDesc: data.metadata.badgeDesc as string,
          badgeIcon: data.metadata.badgeIcon as string,
          profileSlug: data.metadata.profileSlug as string,
          pointsAwarded: data.metadata.pointsAwarded as number,
        })
      );
      return {
        subject: `🏆 New badge: ${data.metadata.badgeName}`,
        html,
      };
    }
      
    case "new_follower": {
      const html = await render(
        NewFollowerEmail({
          recipientName: data.name,
          followerName: data.metadata.followerName as string,
          followerUsername: data.metadata.followerUsername as string,
          followerDocCount: data.metadata.followerDocCount as number,
        })
      );
      return {
        subject: `👤 New follower on getpidief`,
        html,
      };
    }
      
    default:
      return null;
  }
}
