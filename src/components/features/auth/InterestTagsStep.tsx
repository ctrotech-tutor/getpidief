"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { saveOnboardingStep3 } from "@/lib/auth/onboardingActions";
import type { ActionResult } from "@/lib/utils/api";
import styles from "@/app/(onboarding)/onboarding.module.css";
type Tag = { id: string; name: string; slug: string };
const initialState: ActionResult<{ next: string }> = { success: false, error: "" };
export function InterestTagsStep({ allTags }: { allTags: Tag[] }) {
  const router = useRouter(); const { update } = useSession();
  const [selected, setSelected] = useState<string[]>([]); const [query, setQuery] = useState("");
  const [state, action] = useActionState(async (prev: typeof initialState, data: FormData) => {
    try {
      const result = await saveOnboardingStep3(prev, data);
      if (result.success) { try { await update(); } catch { /* Database is authoritative. */ } router.replace(result.data.next); router.refresh(); }
      return result;
    } catch { return { success: false as const, error: "We couldn’t finish setup. Please try again." }; }
  }, initialState);
  const filtered = allTags.filter(t => t.name.toLowerCase().includes(query.trim().toLowerCase()));
  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(x => x !== id) : current.length < 20 ? [...current, id] : current); }
  return <form action={action}>
    {!state.success && state.error && <p className={styles.alert} role="alert">{state.error}</p>}
    {selected.map(id => <input key={id} type="hidden" name="tagIds" value={id} />)}
    {allTags.length ? <><label className={styles.label} htmlFor="topic-search">Explore topics</label><input id="topic-search" className={styles.input} placeholder="Search topics" value={query} onChange={e => setQuery(e.target.value)} /><div className={styles.group}><p className={styles.count} aria-live="polite">{selected.length} selected {selected.length < 3 ? "· choose at least 3" : "· up to 20"}</p><div className={styles.choices}>{filtered.map(tag => <button type="button" key={tag.id} onClick={() => toggle(tag.id)} aria-pressed={selected.includes(tag.id)} className={`${styles.chip} ${selected.includes(tag.id) ? styles.selected : ""}`}>{selected.includes(tag.id) ? "✓ " : "+ "}{tag.name}</button>)}</div>{!filtered.length && <p className={styles.hint}>No topics match that search.</p>}</div></> : <div className={styles.empty}><strong>Your interests can grow with you.</strong><br />There aren&apos;t any topics to choose from yet. Continue to your feed and explore.</div>}
    <div className={styles.bottom}><div className={styles.formNav}><Link className={styles.link} href="/onboarding/step-2">Back</Link><SkipButton /></div><Submit disabled={selected.length < 3} /></div>
    <p className={styles.footerText}>You can continue without selecting topics.</p>
  </form>;
}
function Submit({ disabled }: { disabled: boolean }) { const { pending } = useFormStatus(); return <button className={styles.primary} disabled={pending || disabled}>{pending ? "Finishing…" : "Go to your feed"}</button>; }

function SkipButton() { const { pending } = useFormStatus(); return <button type="submit" name="skip" value="yes" disabled={pending} className={styles.secondary}>Continue without topics</button>; }
