"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveOnboardingStep1, searchInstitutions } from "@/lib/auth/onboardingActions";
import type { ActionResult } from "@/lib/utils/api";
import styles from "@/app/(onboarding)/onboarding.module.css";

type Institution = { id: string; name: string; country: string; source?: "local" | "ror" };
const initialState: ActionResult<{ next: string }> = { success: false, error: "" };
export function InstitutionSearchStep({ popularInstitutions, initialInstitution }: { popularInstitutions: Institution[]; initialInstitution: Institution | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Institution | null>(initialInstitution);
  const [query, setQuery] = useState(initialInstitution?.name ?? "");
  const [results, setResults] = useState<Institution[]>([]);
  const [status, setStatus] = useState("");
  const [state, action] = useActionState(async (prev: typeof initialState, data: FormData) => {
    try {
      const result = await saveOnboardingStep1(prev, data);
      if (result.success) router.push(result.data.next);
      return result;
    } catch { return { success: false as const, error: "We couldn’t save your choice. Please try again." }; }
  }, initialState);
  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await searchInstitutions(query);
        if (!cancelled) { setResults(response.items); setStatus(!response.directoryAvailable ? "Global directory unavailable. Local results are shown; you can also continue without an institution." : response.items.length ? `${response.items.length} results available` : "No matches found. Try another name or continue without an institution."); }
      } catch { if (!cancelled) setStatus("Search is unavailable right now. You can continue without an institution."); }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, selected]);
  function choose(item: Institution) { setSelected(item); setQuery(item.name); setResults([]); setStatus(""); }
  return <form action={action}>
    {!state.success && state.error && <p role="alert" className={styles.alert}>{state.error}</p>}
    <input type="hidden" name="institutionId" value={selected?.id ?? ""} />
    <label htmlFor="institution-search" className={styles.label}>Find your institution</label>
    <input id="institution-search" className={styles.input} placeholder="Search by name" value={query} autoComplete="off" onChange={(e) => { setQuery(e.target.value); setSelected(null); setResults([]); setStatus(""); }} />
    <p className={styles.hint}>{selected ? `Selected: ${selected.name}` : "Type at least 3 characters to search the global directory. This is optional."}</p>
    <p className={styles.hint} role="status">{status}</p>
    {results.length > 0 && <div className={styles.results}>{results.map((item) => <button className={styles.result} type="button" key={item.id} onClick={() => choose(item)}>{item.name}<small>{item.country}{item.source === "ror" ? " · ROR directory" : " · getpidief"}</small></button>)}</div>}
    {!selected && popularInstitutions.length > 0 && <div className={styles.group}><p className={styles.label}>A few places to start</p><div className={styles.choices}>{popularInstitutions.map(item => <button type="button" key={item.id} className={styles.chip} onClick={() => choose(item)}>{item.name}</button>)}</div></div>}
    {!selected && !query && popularInstitutions.length === 0 && <div className={`${styles.group} ${styles.empty}`}><strong>Learning happens everywhere.</strong><br />Search the global directory above, or continue without an institution.</div>}
    <div className={styles.bottom}><SkipButton /><Submit disabled={!selected} /></div>
    <p className={styles.directoryNote}>Search terms are sent to the <a href="https://ror.org/" target="_blank" rel="noreferrer">Research Organization Registry</a> for global results. Selecting a place does not verify affiliation.</p>
  </form>;
}
function Submit({ disabled }: { disabled: boolean }) { const { pending } = useFormStatus(); return <button className={styles.primary} disabled={pending || disabled}>{pending ? "Saving…" : "Continue"}</button>; }

function SkipButton() { const { pending } = useFormStatus(); return <button type="submit" name="skip" value="yes" disabled={pending} className={styles.secondary}>Continue without an institution</button>; }
