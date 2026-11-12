"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveOnboardingStep2 } from "@/lib/auth/onboardingActions";
import type { ActionResult } from "@/lib/utils/api";
import styles from "@/app/(onboarding)/onboarding.module.css";

const CUSTOM = "__custom__";
const NO_YEAR = "__none__";
const initialState: ActionResult<{ next: string }> = { success: false, error: "" };
type Profile = { faculty: string | null; major: string | null; academicLevel: string | null; academicYear: number | null };
type Level = { value: string; label: string };

export function AcademicFocusStep({ faculties, levels, profile }: { faculties: readonly string[]; levels: readonly Level[]; profile: Profile | null }) {
  const router = useRouter();
  const initialFaculty = profile?.faculty ?? "";
  const isCustom = initialFaculty !== "" && !faculties.includes(initialFaculty);
  const [area, setArea] = useState(isCustom ? CUSTOM : initialFaculty);
  const [customArea, setCustomArea] = useState(isCustom ? initialFaculty : "");
  const [level, setLevel] = useState(profile?.faculty ? (profile.academicLevel ?? "other") : "other");
  const [year, setYear] = useState(profile?.academicYear ? String(profile.academicYear) : NO_YEAR);
  const [state, action] = useActionState(async (prev: typeof initialState, data: FormData) => {
    try {
      const result = await saveOnboardingStep2(prev, data);
      if (result.success) router.push(result.data.next);
      return result;
    } catch { return { success: false as const, error: "We couldn’t save your details. Please try again." }; }
  }, initialState);
  const faculty = area === CUSTOM ? customArea : area;
  return <form action={action}>
    {!state.success && state.error && <p className={styles.alert} role="alert">{state.error}</p>}
    <input type="hidden" name="faculty" value={faculty} />
    <input type="hidden" name="academicLevel" value={level} />
    <input type="hidden" name="academicYear" value={year === NO_YEAR ? "" : year} />
    <div className={styles.grid}>
      <div>
        <label className={styles.label} htmlFor="faculty">Area of study</label>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger id="faculty" aria-required="true" className={styles.input}><SelectValue placeholder="Choose an area" /></SelectTrigger>
          <SelectContent>{faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}<SelectItem value={CUSTOM}>Something else</SelectItem></SelectContent>
        </Select>
        {area === CUSTOM && <div className={styles.customArea}><label className={styles.label} htmlFor="custom-faculty">Your area of study</label><input id="custom-faculty" className={styles.input} value={customArea} onChange={event => setCustomArea(event.target.value)} placeholder="Enter your area" maxLength={150} required /></div>}
      </div>
      <div><label className={styles.label} htmlFor="major">Subject or programme</label><input className={styles.input} id="major" name="major" defaultValue={profile?.major ?? ""} placeholder="e.g. Computer Science" maxLength={150} required /></div>
      <div>
        <label className={styles.label} htmlFor="academicLevel">Learning stage</label>
        <Select value={level} onValueChange={setLevel}><SelectTrigger id="academicLevel" className={styles.input}><SelectValue placeholder="Choose a stage" /></SelectTrigger><SelectContent>{levels.map(item => <SelectItem value={item.value} key={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
      </div>
      <div>
        <label className={styles.label} htmlFor="academicYear">Year <span style={{ fontWeight: 400 }}>(optional)</span></label>
        <Select value={year} onValueChange={setYear}><SelectTrigger id="academicYear" className={styles.input}><SelectValue placeholder="Choose a year" /></SelectTrigger><SelectContent><SelectItem value={NO_YEAR}>No year selected</SelectItem>{[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>Year {n}</SelectItem>)}</SelectContent></Select>
      </div>
    </div>
    <p className={styles.hint}>Not studying at an institution? That&apos;s completely fine. You can skip this step.</p>
    <div className={styles.bottom}><div className={styles.formNav}><Link className={styles.link} href="/onboarding/step-1">Back</Link><SkipButton /></div><Submit disabled={!faculty.trim()} /></div>
  </form>;
}
function Submit({ disabled }: { disabled: boolean }) { const { pending } = useFormStatus(); return <button className={styles.primary} disabled={pending || disabled}>{pending ? "Saving…" : "Continue"}</button>; }
function SkipButton() { const { pending } = useFormStatus(); return <button type="submit" name="skip" value="yes" formNoValidate disabled={pending} className={styles.secondary}>Skip for now</button>; }
