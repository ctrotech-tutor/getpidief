import { Text, Link } from "@react-email/components";
import {
  BaseEmailLayout, EmailHeading, EmailBody,
  EmailDivider, EmailNote,
} from "./layouts/BaseLayout";

interface DigestDocument {
  title:        string;
  slug:         string;
  resourceType: string;
  authorName:   string;
  downloadCount:number;
}

interface DigestContributor {
  displayName: string;
  username:    string;
  documents:   DigestDocument[];
}

interface WeeklyDigestEmailProps {
  recipientName:       string;
  weekLabel:           string;
  fromFollowed:        DigestContributor[];
  trendingAtInstitution: DigestDocument[];
  institution?:        string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me";

const TYPE_SHORT: Record<string, string> = {
  past_exam:        "EXAM",
  lecture_notes:    "NOTES",
  research_paper:   "PAPER",
  textbook_summary: "SUMMARY",
  assignment:       "ASSIGNMENT",
  tutorial_sheet:   "TUTORIAL",
  thesis:           "THESIS",
  dissertation:     "DISSERTATION",
  other:            "OTHER",
};

export function WeeklyDigestEmail({
  recipientName, weekLabel, fromFollowed, trendingAtInstitution, institution,
}: WeeklyDigestEmailProps) {
  const firstName     = recipientName.split(" ")[0];
  const totalNewDocs  = fromFollowed.reduce((sum, c) => sum + c.documents.length, 0);

  return (
    <BaseEmailLayout
      preview={`Your weekly academic digest - ${totalNewDocs} new resource${totalNewDocs !== 1 ? "s" : ""} from people you follow.`}
      footerText="You receive this weekly digest because you have follows on getpidief. Adjust in Settings → Notifications."
    >
      <EmailHeading>Your Weekly Archive Digest 📚</EmailHeading>
      <EmailBody>
        Good morning, {firstName}. Here's your personalised academic summary for {weekLabel}.
        {totalNewDocs > 0
          ? ` ${totalNewDocs} new resource${totalNewDocs !== 1 ? "s" : ""} from contributors you follow.`
          : " Nothing new from your follows this week - time to discover more contributors."}
      </EmailBody>

      {/* From followed contributors */}
      {fromFollowed.length > 0 && (
        <>
          <Text style={{ color: "#F1F5F9", fontSize: "13px", fontWeight: 700, margin: "24px 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            From Contributors You Follow
          </Text>
          {fromFollowed.map((contrib) => (
            <div key={contrib.username} style={{ marginBottom: "20px" }}>
              <Link href={`${APP_URL}/u/${contrib.username}`} style={{ color: "#60A5FA", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
                {contrib.displayName}
              </Link>
              {contrib.documents.map((doc) => (
                <div key={doc.slug} style={{ padding: "8px 0 8px 12px", borderLeft: "2px solid rgba(37,99,235,0.3)", marginTop: "8px" }}>
                  <Link href={`${APP_URL}/d/${doc.slug}`} style={{ color: "#F1F5F9", fontSize: "13px", fontWeight: 500, textDecoration: "none", display: "block" }}>
                    {doc.title}
                  </Link>
                  <Text style={{ color: "#6B7280", fontSize: "11px", margin: "2px 0 0" }}>
                    {TYPE_SHORT[doc.resourceType] ?? "DOCUMENT"} · ↓ {doc.downloadCount}
                  </Text>
                </div>
              ))}
            </div>
          ))}
          <EmailDivider />
        </>
      )}

      {/* Trending at institution */}
      {trendingAtInstitution.length > 0 && (
        <>
          <Text style={{ color: "#F1F5F9", fontSize: "13px", fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            🔥 Trending{institution ? ` at ${institution}` : ""}
          </Text>
          {trendingAtInstitution.slice(0, 5).map((doc, i) => (
            <div key={doc.slug} style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "flex-start" }}>
              <Text style={{ color: "#6B7280", fontSize: "13px", fontWeight: 700, minWidth: "20px", margin: 0 }}>
                {i + 1}.
              </Text>
              <div style={{ flex: 1 }}>
                <Link href={`${APP_URL}/d/${doc.slug}`} style={{ color: "#F1F5F9", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
                  {doc.title}
                </Link>
                <Text style={{ color: "#6B7280", fontSize: "11px", margin: "2px 0 0" }}>
                  by {doc.authorName} · ↓ {doc.downloadCount}
                </Text>
              </div>
            </div>
          ))}
          <EmailDivider />
        </>
      )}

      {/* CTA */}
      <div style={{ textAlign: "center", margin: "24px 0" }}>
        <Link
          href={`${APP_URL}/explore`}
          style={{
            display: "inline-block", background: "#2563EB", color: "#fff",
            padding: "12px 28px", borderRadius: "10px", fontSize: "14px",
            fontWeight: 600, textDecoration: "none",
          }}
        >
          Explore Full Archive →
        </Link>
      </div>

      <EmailNote>
        Follow more contributors and set your interest tags to get a richer digest next week.
      </EmailNote>
    </BaseEmailLayout>
  );
}

WeeklyDigestEmail.PreviewProps = {
  recipientName: "Ada Lovelace",
  weekLabel:     "Week of 13 April 2026",
  institution:   "University of Cape Town",
  fromFollowed: [
    {
      displayName: "Charles Babbage",
      username:    "cbabbage",
      documents: [
        { title: "Mechanical Computing - Lecture 4 Notes", slug: "mech-computing-lec4", resourceType: "lecture_notes", authorName: "Charles Babbage", downloadCount: 142 },
        { title: "Difference Engine Design Thesis 2025",   slug: "diff-engine-thesis",  resourceType: "thesis",         authorName: "Charles Babbage", downloadCount: 89  },
      ],
    },
  ],
  trendingAtInstitution: [
    { title: "CS201 Past Exam 2024",      slug: "cs201-past-exam-2024",    resourceType: "past_exam",     authorName: "Jane Doe",   downloadCount: 1240 },
    { title: "Data Structures Summary",   slug: "data-structures-summary", resourceType: "textbook_summary", authorName: "John Smith", downloadCount: 892 },
  ],
} as WeeklyDigestEmailProps;
