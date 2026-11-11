"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { saveOnboardingStep3, saveInterestSettings } from "@/lib/auth/onboardingActions";
import type { TopicChoice } from "@/lib/interests/catalog";
import styles from "@/app/(onboarding)/onboarding.module.css";

export function InterestTagsStep({ allTags, initialSelected = [], settings = false }: { allTags: TopicChoice[]; initialSelected?: string[]; settings?: boolean }) {
  const router = useRouter(); const { update } = useSession();
  const [selected, setSelected] = useState(initialSelected); const [query, setQuery] = useState("");
  const [state, action] = useActionState(async (_: { error: string; message: string }, data: FormData) => {
    try {
      if (settings) {
        const result = await saveInterestSettings(null, data);
        return result.success ? { error: "", message: result.data.message } : { error: result.error, message: "" };
      }
      const result = await saveOnboardingStep3(null, data);
      if (result.success) { try { await update(); } catch { /* Database is authoritative. */ } router.replace(result.data.next); router.refresh(); return { error: "", message: "" }; }
      return { error: result.error, message: "" };
    } catch { return { error: "Couldn’t save your interests. Please try again.", message: "" }; }
  }, { error: "", message: "" });
  const filtered = allTags.filter(t => t.name.toLowerCase().includes(query.trim().toLowerCase()));
  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(x => x !== id) : current.length < 20 ? [...current, id] : current); }
  return <form action={action}>
    {state.error && <p className={styles.alert} role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
    {selected.map(id => <input key={id} type="hidden" name={id.startsWith("starter:") ? "starterSlugs" : "tagIds"} value={id.startsWith("starter:") ? id.slice(8) : id} />)}
    <label className={styles.label} htmlFor="topic-search">Explore topics</label><input id="topic-search" className={styles.input} placeholder="Search topics" value={query} onChange={e => setQuery(e.target.value)} />
    <div className={styles.group}><p className={styles.count} aria-live="polite">{selected.length} selected · up to 20</p><div className={`${styles.choices} ${styles.topicList}`}>{filtered.map(tag => <button type="button" key={tag.id} onClick={() => toggle(tag.id)} aria-pressed={selected.includes(tag.id)} disabled={selected.length >= 20 && !selected.includes(tag.id)} className={`${styles.chip} ${selected.includes(tag.id) ? styles.selected : ""}`}>{selected.includes(tag.id) ? "✓ " : "+ "}{tag.name}</button>)}</div>{!filtered.length && <p className={styles.hint}>No topics match that search.</p>}</div>
    <div className={styles.bottom}>{!settings && <div className={styles.formNav}><Link className={styles.link} href="/onboarding/step-2">Back</Link><SkipButton /></div>}<Submit settings={settings} /></div>
    {!settings && <p className={styles.footerText}>Optional. You can change these later in settings.</p>}
  </form>;
}
function Submit({ settings }: { settings: boolean }) { const { pending } = useFormStatus(); return <button className={styles.primary} disabled={pending}>{pending ? "Saving…" : settings ? "Save interests" : "Go to your feed"}</button>; }
function SkipButton() { const { pending } = useFormStatus(); return <button type="submit" name="skip" value="yes" disabled={pending} className={styles.secondary}>Continue without topics</button>; }
