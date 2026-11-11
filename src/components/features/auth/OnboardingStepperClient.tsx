"use client";
import { usePathname } from "next/navigation";
import styles from "@/app/(onboarding)/onboarding.module.css";

export function OnboardingStepperClient({ steps }: { steps: readonly { number: number; label: string }[] }) {
  const current = Number(usePathname().match(/step-(\d)/)?.[1] ?? 1);
  return <nav className={styles.stepper} aria-label="Setup progress">{steps.map((step) => <div key={step.number} className={`${styles.step} ${step.number <= current ? styles.stepActive : ""}`} aria-current={step.number === current ? "step" : undefined}><div className={styles.stepLine} /><span>{String(step.number).padStart(2, "0")} / {step.label}</span></div>)}</nav>;
}
