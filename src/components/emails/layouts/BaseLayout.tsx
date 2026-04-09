import {
  Body, Container, Head, Html, Preview,
  Section, Text, Hr, Link, Img,
} from "@react-email/components";

interface BaseEmailLayoutProps {
  preview:  string;
  children: React.ReactNode;
  footerText?: string;
}

const BRAND_COLOR   = "#2563EB";
const BG_DARK       = "#060C19";
const BG_CARD       = "#111D3A";
const TEXT_PRIMARY  = "#F1F5F9";
const TEXT_MUTED    = "#8B9CC4";
const BORDER_COLOR  = "rgba(255,255,255,0.08)";

export function BaseEmailLayout({ preview, children, footerText }: BaseEmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BG_DARK,
          fontFamily:       "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          margin:           0,
          padding:          "40px 0",
        }}
      >
        <Container
          style={{
            maxWidth:        "580px",
            margin:          "0 auto",
            padding:         "0 20px",
          }}
        >
          {/* Logo header */}
          <Section style={{ textAlign: "center", marginBottom: "32px" }}>
            <Text
              style={{
                fontFamily:   "'Inter', sans-serif",
                fontWeight:   800,
                fontSize:     "20px",
                letterSpacing:"-0.03em",
                color:        TEXT_PRIMARY,
                margin:       0,
              }}
            >
              getpidief
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: "12px", margin: "4px 0 0" }}>
              The Academic Resource Network
            </Text>
          </Section>

          {/* Card */}
          <Section
            style={{
              backgroundColor: BG_CARD,
              border:           `1px solid ${BORDER_COLOR}`,
              borderRadius:     "16px",
              padding:          "32px",
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: "center", marginTop: "32px" }}>
            <Text style={{ color: TEXT_MUTED, fontSize: "12px", lineHeight: "1.5", margin: 0 }}>
              {footerText ?? "You received this email because you have an account on getpidief."}
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: "12px", margin: "8px 0 0" }}>
              <Link href="https://getpidief.me/settings/notifications" style={{ color: TEXT_MUTED }}>
                Manage email preferences
              </Link>
              {" · "}
              <Link href="https://getpidief.me/privacy" style={{ color: TEXT_MUTED }}>
                Privacy Policy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Shared styled components ──────────────────────────────────────────────────

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color:        "#F1F5F9",
        fontSize:     "22px",
        fontWeight:   700,
        letterSpacing:"-0.02em",
        lineHeight:   "1.3",
        margin:       "0 0 12px",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailBody({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color:      "#8B9CC4",
        fontSize:   "15px",
        lineHeight: "1.6",
        margin:     "0 0 20px",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Link
        href={href}
        style={{
          display:        "inline-block",
          backgroundColor:"#2563EB",
          color:          "#ffffff",
          fontSize:       "14px",
          fontWeight:     600,
          padding:        "12px 28px",
          borderRadius:   "10px",
          textDecoration: "none",
          letterSpacing:  "-0.01em",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function EmailDivider() {
  return (
    <Hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "24px 0" }} />
  );
}

export function EmailNote({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color:        "#4A5880",
        fontSize:     "12px",
        lineHeight:   "1.5",
        margin:       "16px 0 0",
        textAlign:    "center",
      }}
    >
      {children}
    </Text>
  );
}