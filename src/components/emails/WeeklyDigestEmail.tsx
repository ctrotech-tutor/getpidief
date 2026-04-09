import * as React from "react";
import {
  Html,
  Body,
  Container,
  Head,
  Heading,
  Text,
  Preview,
  Section,
  Link,
  Hr,
  Img,
} from "@react-email/components";

interface WeeklyDigestEmailProps {
  userId: string;
  followedDocs: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    author_name: string;
    download_count: number;
  }>;
  trendingDocs: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    download_count: number;
  }>;
}

export function WeeklyDigestEmail({
  userId,
  followedDocs,
  trendingDocs,
}: WeeklyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your weekly academic digest from getpidief</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your Weekly Digest 📚</Heading>
          
          <Text style={text}>
            Here's what happened in your academic circle this week!
          </Text>

          {followedDocs.length > 0 && (
            <Section style={section}>
              <Heading style={h2}>New from contributors you follow</Heading>
              {followedDocs.map((doc) => (
                <div key={doc.id} style={docContainer}>
                  <Text style={docTitle}>
                    <Link href={`https://getpidief.me/d/${doc.slug}`} style={link}>
                      {doc.title}
                    </Link>
                  </Text>
                  <Text style={docMeta}>
                    Uploaded by {doc.author_name} • {doc.download_count} downloads
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {trendingDocs.length > 0 && (
            <Section style={section}>
              <Heading style={h2}>Trending related to your interests</Heading>
              {trendingDocs.map((doc) => (
                <div key={doc.id} style={docContainer}>
                  <Text style={docTitle}>
                    <Link href={`https://getpidief.me/d/${doc.slug}`} style={link}>
                      {doc.title}
                    </Link>
                  </Text>
                  <Text style={docMeta}>
                    {doc.download_count} recent downloads
                  </Text>
                </div>
              ))}
            </Section>
          )}

          <Hr style={hr} />
          
          <Text style={footer}>
            You received this email because you opted into weekly digests.
            <br />
            <Link href="https://getpidief.me/settings/notifications" style={footerLink}>
              Unsubscribe or manage your preferences here.
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  border: "1px solid #f0f0f0",
  borderRadius: "8px",
};

const section = {
  padding: "0 48px",
  marginTop: "24px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  padding: "0 48px",
};

const h2 = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "600",
  marginBottom: "16px",
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "center" as const,
  padding: "0 48px",
};

const docContainer = {
  marginBottom: "12px",
  padding: "12px",
  backgroundColor: "#fafafa",
  borderRadius: "6px",
};

const docTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 4px 0",
};

const link = {
  color: "#5469d4",
  textDecoration: "none",
};

const docMeta = {
  fontSize: "13px",
  color: "#8898aa",
  margin: "0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  padding: "0 48px",
};

const footerLink = {
  color: "#8898aa",
  textDecoration: "underline",
};
