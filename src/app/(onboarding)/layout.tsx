import type { Metadata } from "next";
import { Brand } from "@/components/brand/Brand";
import { OnboardingStepperClient } from "@/components/features/auth/OnboardingStepperClient";
import styles from "./onboarding.module.css";

export const metadata: Metadata = { title: "Make it yours | getpidief" };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>
    <header className={styles.header}><Brand /><span className={styles.headerNote}>A little more human. A lot more learning.</span></header>
    <main className={styles.layout}>
      <aside className={styles.aside}>
        <p className={styles.eyebrow}>A SPACE TO LEARN TOGETHER</p>
        <h1 className={styles.asideTitle}>Your curiosity<br /><em>belongs here.</em></h1>
        <p className={styles.asideCopy}>A few details can help make this space feel more like yours. Take what feels right and leave the rest for later.</p>
        <div className={styles.asideRule} />
        <p className={styles.asideFoot}>Share ideas. Ask better questions.<br />Find people learning alongside you.</p>
      </aside>
      <section className={styles.panel} aria-label="Set up your profile">
        <OnboardingStepperClient steps={[{ number: 1, label: "Your place" }, { number: 2, label: "Your path" }, { number: 3, label: "Your interests" }]} />
        {children}
      </section>
    </main>
  </div>;
}
