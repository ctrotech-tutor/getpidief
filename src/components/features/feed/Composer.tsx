"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MessageCircle, PenLine } from "lucide-react";
import { createPost } from "@/app/(app)/home/actions";
import styles from "./feed.module.css";

export function Composer({ name }: { name: string }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"thought" | "question">("thought");
  const [state, action, pending] = useActionState(async (_: { error: string; success: boolean }, data: FormData) => {
    try { await createPost(data); setText(""); setKind("thought"); return { error: "", success: true }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Could not publish your post. Please try again.", success: false }; }
  }, { error: "", success: false });
  return <section className={styles.composer} aria-labelledby="composer-title">
    <div className={styles.composerHeader}><span className={styles.avatar} aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "?"}</span><div><h2 id="composer-title">Start something good.</h2><p>A thought, a question, a new idea.</p></div></div>
    <form action={action}>
      <label className="sr-only" htmlFor="feed-body">Your post</label>
      <textarea id="feed-body" name="body" disabled={pending} required maxLength={3000} rows={3} placeholder="What’s on your mind?" value={text} onChange={event => setText(event.target.value)} className={styles.textarea} />
      <div className={styles.composerBottom}><div className={styles.kindGroup} aria-label="Post type">
        <label className={kind === "thought" ? styles.kindSelected : ""}><input type="radio" name="kind" value="thought" disabled={pending} checked={kind === "thought"} onChange={() => setKind("thought")} /><PenLine size={15} aria-hidden="true" /> Thought</label>
        <label className={kind === "question" ? styles.kindSelected : ""}><input type="radio" name="kind" value="question" disabled={pending} checked={kind === "question"} onChange={() => setKind("question")} /><MessageCircle size={15} aria-hidden="true" /> Question</label>
      </div><Publish /></div>
      {state.error && <p role="alert" className={styles.error}>{state.error}</p>}{state.success && <p role="status" className={styles.success}>Your post is published.</p>}
    </form>
  </section>;
}
function Publish() { const { pending } = useFormStatus(); return <button className={styles.publish} disabled={pending}>{pending ? "Posting…" : "Post"}</button>; }
