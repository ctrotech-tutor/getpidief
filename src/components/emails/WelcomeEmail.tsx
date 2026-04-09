import { Text, Link } from "@react-email/components";
import { BaseEmailLayout, EmailHeading, EmailBody, EmailButton, EmailDivider, EmailNote } from "./layouts/BaseLayout";

interface WelcomeEmailProps {
  name:  string;
  email: string;
}

export function WelcomeEmail({ name, email }: WelcomeEmailProps) {
  const firstName = name.split(" ")[0];

  return (
    <BaseEmailLayout
      preview={`Welcome to getpidief, ${firstName}! Your scholar profile is ready.`}
      footerText="You received this because you created a getpidief account."
    >
      <EmailHeading>Welcome to getpidief, {firstName}. 👋</EmailHeading>

      <EmailBody>
        Your scholar profile is live. You now have access to millions of verified
        academic resources — past exams, lecture notes, research papers, and more.
      </EmailBody>

      <EmailButton href="https://getpidief.me/explore">
        Explore the Archive →
      </EmailButton>

      <EmailDivider />

      <Text style={{ color: "#8B9CC4", fontSize: "13px", margin: "0 0 16px" }}>
        Here's what you can do right now:
      </Text>

      {[
        { icon: "🔍", title: "Discover resources", desc: "Search by course code, topic, or institution." },
        { icon: "📄", title: "Complete your profile", desc: "Set your institution and academic interests for personalized recommendations." },
        { icon: "⬆️",  title: "Contribute",          desc: "Upload notes and past papers to earn reputation and help fellow scholars." },
      ].map((item) => (
        <Text key={item.title} style={{ color: "#8B9CC4", fontSize: "14px", lineHeight: "1.5", margin: "0 0 12px" }}>
          {item.icon} <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{item.title}</span>
          {" — "}{item.desc}
        </Text>
      ))}

      <EmailDivider />

      <EmailNote>
        Logged in as {email}.{" "}
        <Link href="https://getpidief.me/settings" style={{ color: "#60A5FA" }}>
          Manage your account
        </Link>
      </EmailNote>
    </BaseEmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name:  "Ada Lovelace",
  email: "ada@uct.ac.za",
} as WelcomeEmailProps;