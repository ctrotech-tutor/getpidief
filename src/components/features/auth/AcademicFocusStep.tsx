"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveOnboardingStep2 } from "@/lib/auth/onboardingActions";
import type { ActionResult } from "@/lib/utils/api";
import styles from "@/app/(onboarding)/onboarding.module.css";
const initialState: ActionResult<{ next: string }> = { success: false, error: "" };
type Profile = { faculty: string | null; major: string | null; academicLevel: string | null; academicYear: number | null };
export function AcademicFocusStep({ faculties, levels, profile }: { faculties: readonly string[]; levels: readonly { value: string; label: string }[]; profile: Profile | null }) {
  const router = useRouter();
  const [state, action] = useActionState(async (prev: typeof initialState, data: FormData) => { try { const result = await saveOnboardingStep2(prev, data); if (result.success) router.push(result.data.next); return result; } catch { return { success: false as const, error: "We couldn’t save your details. Please try again." }; } }, initialState);
  return <form action={action}>
    {!state.success && state.error && <p className={styles.alert} role="alert">{state.error}</p>}
    <div className={styles.grid}>
      <div><label className={styles.label} htmlFor="faculty">Area of study</label><select className={styles.input} id="faculty" name="faculty" defaultValue={profile?.faculty ?? ""} required><option value="">Choose an area</option>{faculties.map(f => <option key={f}>{f}</option>)}</select></div>
      <div><label className={styles.label} htmlFor="major">Subject or programme</label><input className={styles.input} id="major" name="major" defaultValue={profile?.major ?? ""} placeholder="e.g. Computer Science" maxLength={150} required /></div>
      <div><label className={styles.label} htmlFor="academicLevel">Learning stage</label><select className={styles.input} id="academicLevel" name="academicLevel" defaultValue={profile?.faculty ? (profile.academicLevel ?? "other") : "other"}>{levels.map(level => <option value={level.value} key={level.value}>{level.label}</option>)}</select></div>
      <div><label className={styles.label} htmlFor="academicYear">Year <span style={{ fontWeight: 400 }}>(optional)</span></label><select className={styles.input} id="academicYear" name="academicYear" defaultValue={profile?.academicYear ?? ""}><option value="">Choose a year</option>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Year {n}</option>)}</select></div>
    </div>
    <p className={styles.hint}>Not studying at an institution? That&apos;s completely fine. You can skip this step.</p>
    <div className={styles.bottom}><div className={styles.formNav}><Link className={styles.link} href="/onboarding/step-1">Back</Link><SkipButton /></div><Submit /></div>
  </form>;
}
function Submit() { const { pending } = useFormStatus(); return <button className={styles.primary} disabled={pending}>{pending ? "Saving…" : "Continue"}</button>; }

function SkipButton() { const { pending } = useFormStatus(); return <button type="submit" name="skip" value="yes" formNoValidate disabled={pending} className={styles.secondary}>Skip for now</button>; }
