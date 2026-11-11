"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Bookmark, Compass, FileText, GraduationCap, Heart, Home, Library, MessageCircle, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import styles from "./preview.module.css";

type Post = {
  id: string; name: string; handle: string; initials: string; color: string; time: string;
  subject: string; text: string; likes: number; kind?: "question";
  resource?: { title: string; type: string; detail: string; note: string };
};

const initialPosts: Post[] = [
  { id: "p1", name: "Nia Okafor", handle: "nia.studies", initials: "NO", color: "peach", time: "2h ago", subject: "BIOLOGY", text: "I made a visual guide to cell signalling for my revision. Sharing it here in case it helps someone else make sense of the pathways.", likes: 128, resource: { title: "Cell signalling, made a little clearer", type: "STUDY NOTES", detail: "12 pages  ·  Biology", note: "A visual walkthrough of receptors, second messengers and the pathways that connect them." } },
  { id: "p2", name: "Daniel Kim", handle: "daniellearns", initials: "DK", color: "blue", time: "4h ago", subject: "MATHS", text: "What finally made integration click for you? I understand the rules, but I still struggle to see when to use each method.", likes: 46, kind: "question" },
  { id: "p3", name: "Amara Ellis", handle: "amara.reads", initials: "AE", color: "lavender", time: "Yesterday", subject: "LITERATURE", text: "A few notes from my reading this week. I keep coming back to the idea that the setting can tell us as much as the narrator does.", likes: 84, resource: { title: "Reading between the lines", type: "READING GUIDE", detail: "8 pages  ·  Literature", note: "A short guide to noticing point of view, setting and the details that shape a story." } },
];
type Reply = { name: string; initials: string; color: string; text: string; time: string };
const sampleReplies: Record<string, Reply[]> = {
  p1: [{ name: "Daniel Kim", initials: "DK", color: "blue", time: "1h ago", text: "The diagram on second messengers helped me connect the steps. Thank you for sharing this." }],
  p2: [{ name: "Nia Okafor", initials: "NO", color: "peach", time: "2h ago", text: "I start by looking for a function and its derivative together. That usually points me towards substitution." }, { name: "Amara Ellis", initials: "AE", color: "lavender", time: "1h ago", text: "Working backwards from the derivative helped me see why each method works." }],
  p3: [{ name: "Daniel Kim", initials: "DK", color: "blue", time: "Yesterday", text: "Do you have a favourite example of setting changing how you read a scene?" }],
};
const subjects = ["Biology", "Mathematics", "Design", "Psychology", "Literature"];

function BrandMark() { return <svg className={styles.originalMark} width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="2" y="4" width="20" height="24" rx="4" fill="#527a5b" /><rect x="10" y="8" width="20" height="20" rx="4" fill="#a1bf9b" opacity=".9" style={{ mixBlendMode: "multiply" }} /><circle cx="20" cy="18" r="4" fill="white" /></svg>; }

function Avatar({ initials, color, size = "normal" }: { initials: string; color: string; size?: "normal" | "small" }) {
  return <span aria-hidden="true" className={`${styles.avatar} ${styles[color]} ${size === "small" ? styles.avatarSmall : ""}`}>{initials}</span>;
}

export function FeedPreview() {
  const [tab, setTab] = useState<"For you" | "Following">("For you");
  const [posts, setPosts] = useState(initialPosts);
  const [likes, setLikes] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>(["nia.studies", "daniellearns"]);
  const [postKind, setPostKind] = useState<"Post" | "Question">("Post");
  const [query, setQuery] = useState("");
  const [contentFilter, setContentFilter] = useState<"All" | "Questions" | "Resources">("All");
  const [draft, setDraft] = useState("");
  const [opened, setOpened] = useState<Post | null>(null);
  const [message, setMessage] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [dialogView, setDialogView] = useState<"reader" | "discussion" | "profile">("discussion");
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyDraft, setReplyDraft] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const dialogOpen = opened !== null;
  useEffect(() => {
    if (!dialogOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const buttons = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]") ?? []);
    buttons()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpened(null);
      if (event.key === "Tab") {
        const items = buttons();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [dialogOpen]);
  const visiblePosts = useMemo(() => posts.filter((post) => (showSaved ? saved.includes(post.id) : (tab === "For you" || followed.includes(post.handle) || post.handle === "your.preview")) && (contentFilter === "All" || (contentFilter === "Questions" ? post.kind === "question" : !!post.resource)) && `${post.text} ${post.subject} ${post.name} ${post.resource?.title ?? ""}`.toLowerCase().includes(query.toLowerCase().trim())), [posts, query, tab, showSaved, saved, followed, contentFilter]);
  const toggle = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const startPost = () => {
    setShowSaved(false);
    requestAnimationFrame(() => document.getElementById("compose")?.focus());
  };
  const addPost = () => {
    if (!draft.trim()) return;
    setPosts((current) => [{ id: `draft-${Date.now()}`, name: "You", handle: "your.preview", initials: "YO", color: "sage", time: "Just now", subject: postKind === "Question" ? "QUESTION" : "YOUR POST", kind: postKind === "Question" ? "question" : undefined, text: draft.trim(), likes: 0 }, ...current]);
    setDraft(""); setPostKind("Post"); setTab("For you"); setShowSaved(false); setQuery(""); setContentFilter("All"); setMessage("Added to this preview only. It will disappear when you refresh.");
  };
  return (
    <div className={styles.app}>
      <div className={styles.previewBar}><span><span className={styles.previewDot} /> DESIGN PREVIEW</span><span>Sample content and interactions. Nothing is published.</span><Link href="/">Back to homepage <ArrowRight size={13} /></Link></div>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Preview navigation">
          <Link className={styles.brand} href="/"><BrandMark /><span>getpidief<span className={styles.brandPeriod}>.</span><small>A SOCIAL HOME FOR LEARNING</small></span></Link>
          <div className={styles.sideLabel}>YOUR SPACE</div>
          <nav className={styles.sideNav}><a className={!showSaved ? styles.activeNav : ""} href="#feed" onClick={() => { setShowSaved(false); setQuery(""); setContentFilter("All"); }}><Home size={19} strokeWidth={1.7} /> Home <span className={styles.navDot} /></a><a href="#discover"><Compass size={19} strokeWidth={1.7} /> Discover</a><a className={showSaved ? styles.activeNav : ""} href="#feed" onClick={() => { setShowSaved(true); setQuery(""); setContentFilter("All"); }}> <Library size={19} strokeWidth={1.7} /> Your library</a></nav>
          <div className={styles.sideDivider} />
          <div className={styles.sideLabel}>YOUR INTERESTS <span>EXAMPLE</span></div>
          <div className={styles.interestList}>{subjects.slice(0, 4).map((subject, index) => <button key={subject} onClick={() => { setQuery(subject === "Mathematics" ? "maths" : subject); setTab("For you"); setShowSaved(false); }}><span className={`${styles.interestIcon} ${styles[`interest${index}`]}`}>#</span>{subject}</button>)}</div>
          <button className={styles.sidebarCreate} onClick={startPost}><Plus size={18} /> Create a post</button>
          <div className={styles.sidebarBottom}><div className={styles.miniBrand}>LEARN SOMETHING.<br /><strong>PASS IT ON.</strong></div><span>A place to learn together.</span></div>
        </aside>

        <main className={styles.main} id="feed">
          <div className={styles.mobileBrand}><BrandMark /><span>getpidief<span>.</span></span></div>
          <header className={styles.header}><div><span className={styles.headerEyebrow}>YOUR STUDY SPACE <span>✳</span></span><h1>Good to see you here<span>.</span></h1><p>See what people are learning and sharing.</p></div><div className={styles.headerRight}><span className={styles.dateLabel}>A SPACE TO LEARN<br /><strong>TOGETHER, EVERY DAY</strong></span><Avatar initials="YO" color="sage" /></div></header>
          {!showSaved && <section className={styles.intro}><div><div className={styles.introKicker}><span /> LEARNING IS BETTER TOGETHER</div><h2>Good ideas<br /><em>are better shared.</em></h2><p>Share your notes, ask a question, or join a conversation.</p><a href="#compose">Share something <ArrowRight size={15} /></a></div><div className={styles.introArt} aria-hidden="true"><span className={styles.artOrbit} /><span className={styles.artPage}><i /><i /><i /><b>good<br />to know.</b></span><span className={styles.artStar}>✳</span><span className={styles.artNote}>PASS IT ON ↗</span></div></section>}
          <div className={styles.feedHeading}><div><div className={styles.sectionKicker}>YOUR HOME <span>✳</span></div><h2>{showSaved ? "Saved posts" : "Your feed"}<span>.</span></h2></div><div className={styles.feedHeadingNote}>Posts from people<br />and subjects you follow.</div></div>
          <label className={styles.mobileSearch}><Search size={18} /><span className={styles.srOnly}>Search sample posts on mobile</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts and people" /></label>
          <div className={styles.tabs}><div role="tablist" aria-label="Feed view">{(["For you", "Following"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? styles.selectedTab : ""} onClick={() => { setShowSaved(false); setTab(item); }}>{item}</button>)}</div><span><SlidersHorizontal size={14} /> YOUR FEED</span></div>
          <div className={styles.filterRow} aria-label="Filter sample posts">{(["All", "Questions", "Resources"] as const).map((filter) => <button key={filter} aria-pressed={contentFilter === filter} onClick={() => setContentFilter(filter)}>{filter}</button>)}{(query || contentFilter !== "All") && <button className={styles.clearFilters} onClick={() => { setQuery(""); setContentFilter("All"); }}>Clear filters <X size={13} /></button>}</div>
          {!showSaved && <section className={styles.composer} aria-label="Sample post composer"><Avatar initials="YO" color="sage" /><div className={styles.composerBody}><label className={styles.srOnly} htmlFor="compose">Write a sample post</label><textarea id="compose" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What have you been learning?" maxLength={500} /><div className={styles.composerFooter}><div className={styles.composeKinds} aria-label="Post type"><button type="button" aria-pressed={postKind === "Post"} onClick={() => setPostKind("Post")}>Post</button><button type="button" aria-pressed={postKind === "Question"} onClick={() => setPostKind("Question")}>Question</button><span>{draft.length}/500</span></div><button onClick={addPost} disabled={!draft.trim()}>Share <ArrowRight size={14} /></button></div></div></section>}
          {message && <div className={styles.notice} role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss message"><X size={15} /></button></div>}
          <div className={styles.posts}>{visiblePosts.length === 0 ? <div className={styles.empty}><strong>Nothing here yet.</strong><p>{showSaved ? "Save a post and it will appear here in this preview." : "Try another search or check the For you feed."}</p></div> : visiblePosts.map((post) => <article className={styles.post} key={post.id}>
            <div className={styles.postHeader}><Avatar initials={post.initials} color={post.color} /><div className={styles.postIdentity}><button className={styles.authorButton} onClick={() => { setDialogView("profile"); setOpened(post); }}>{post.name}</button><span>@{post.handle} <i>·</i> {post.time}</span></div><span className={styles.postTopic}>{post.subject}</span></div>
            <p className={styles.postText}>{post.text}</p>
            {post.resource && <button className={styles.resource} onClick={() => { setDialogView("reader"); setReplyDraft(""); setOpened(post); }}><span className={styles.resourceCover}><span className={styles.coverLines}>≋<br />≋<br />≋</span><FileText size={18} /></span><span className={styles.resourceText}><span>{post.resource.type}</span><strong>{post.resource.title}</strong><small>{post.resource.detail}</small></span><span className={styles.resourceArrow}><ArrowDownRight size={17} /></span></button>}
            <div className={styles.postActions}><button onClick={() => toggle(post.id, setLikes)} aria-pressed={likes.includes(post.id)} className={likes.includes(post.id) ? styles.liked : ""}><Heart size={17} fill={likes.includes(post.id) ? "currentColor" : "none"} /> {post.likes + (likes.includes(post.id) ? 1 : 0)}</button><button onClick={() => { setDialogView("discussion"); setReplyDraft(""); setOpened(post); }}><MessageCircle size={17} /> {(sampleReplies[post.id]?.length ?? 0) + (replies[post.id]?.length ?? 0)} <span>replies</span></button><button className={styles.saveAction} aria-pressed={saved.includes(post.id)} aria-label={saved.includes(post.id) ? "Remove from sample library" : "Save to sample library"} onClick={() => toggle(post.id, setSaved)}><Bookmark size={17} fill={saved.includes(post.id) ? "currentColor" : "none"} /> <span>{saved.includes(post.id) ? "Saved" : "Save"}</span></button></div>
          </article>)}</div>
          <footer className={styles.feedFooter}>YOU ARE ALL CAUGHT UP <span>✳</span></footer>
        </main>

        <aside className={styles.rightbar} id="discover"><label className={styles.search}><Search size={18} /><span className={styles.srOnly}>Search sample posts</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the preview" /></label><div className={styles.rightTop}><span>DISCOVER</span><span>SAMPLE</span></div><section className={styles.discoverCard}><div className={styles.cardHeading}><div><span className={styles.sectionKicker}>PEOPLE</span><h2>Curious minds<span>.</span></h2></div><span className={styles.smallStar}>✳</span></div><p>People you might want to follow.</p><div className={styles.person}><Avatar initials="AE" color="lavender" size="small" /><div><strong>Amara Ellis</strong><span>Literature</span></div><button onClick={() => toggle("amara.reads", setFollowed)} aria-pressed={followed.includes("amara.reads")}>{followed.includes("amara.reads") ? "Following" : "+ Follow"}</button></div><div className={styles.cardFoot}>SUGGESTED FOR YOU <ArrowRight size={15} /></div></section>
          <section className={styles.topicsCard}><div className={styles.cardHeading}><div><span className={styles.sectionKicker}>SUBJECTS</span><h2>Explore subjects<span>.</span></h2></div><Compass size={20} strokeWidth={1.3} /></div><p>See posts by subject.</p><div className={styles.topicChips}>{subjects.map((subject) => <button key={subject} onClick={() => { setQuery(subject === "Mathematics" ? "maths" : subject); setTab("For you"); setShowSaved(false); }}># {subject}</button>)}</div></section>
          <section className={styles.libraryCard} id="library"><div className={styles.libraryIcon}><Bookmark size={18} /></div><span>YOUR LIBRARY</span><h2>Keep it close.</h2><p>Save the things you want to come back to. Your preview library has {saved.length} {saved.length === 1 ? "item" : "items"}.</p><button onClick={() => { setShowSaved(true); setQuery(""); setContentFilter("All"); document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" }); }}>Your saved posts <ArrowRight size={15} /></button></section>
          <div className={styles.rightFooter}><span>GETPIDIEF © PREVIEW</span><span>SAMPLE CONTENT</span></div>
        </aside>
      </div>
      <nav className={styles.mobileNav} aria-label="Mobile preview navigation"><a href="#feed" aria-current={!showSaved ? "page" : undefined} onClick={() => { setShowSaved(false); setQuery(""); setContentFilter("All"); }}><Home size={21} /><span>Home</span></a><a href="#discover"><Compass size={21} /><span>Discover</span></a><button onClick={startPost} aria-label="Create a sample post"><Plus size={24} /></button><a href="#feed" aria-current={showSaved ? "page" : undefined} onClick={() => { setShowSaved(true); setQuery(""); setContentFilter("All"); }}><Bookmark size={21} /><span>Saved</span></a><Link href="/"><GraduationCap size={21} /><span>Home page</span></Link></nav>
      {opened && <div className={styles.modalBackdrop} onClick={() => setOpened(null)}>
        <section ref={dialogRef} className={`${styles.modal} ${styles.detailModal}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
          <button className={styles.modalClose} onClick={() => setOpened(null)} aria-label="Close"><X size={20} /></button>
          <span className={styles.sectionKicker}>SAMPLE {dialogView === "profile" ? "PROFILE" : opened.resource ? "RESOURCE" : "CONVERSATION"}</span>
          <h2 id="modal-title">{dialogView === "profile" ? opened.name : opened.resource?.title ?? "The conversation"}</h2>
          <p className={styles.detailByline}>{dialogView === "profile" ? `@${opened.handle}` : <>Shared by {opened.name} <span>·</span> {opened.subject.toLowerCase()}</>}</p>
          {dialogView !== "profile" && <div className={styles.detailTabs}>
            {opened.resource && <button aria-pressed={dialogView === "reader"} onClick={() => setDialogView("reader")}>Read</button>}
            <button aria-pressed={dialogView === "discussion"} onClick={() => setDialogView("discussion")}>Discussion</button>
          </div>}
          {dialogView === "profile" ? <div className={styles.profilePreview}><div className={styles.profileTop}><Avatar initials={opened.initials} color={opened.color} /><div><strong>{opened.name}</strong><span>Sample profile</span></div>{opened.handle !== "your.preview" && <button aria-pressed={followed.includes(opened.handle)} onClick={() => toggle(opened.handle, setFollowed)}>{followed.includes(opened.handle) ? "Following" : "Follow"}</button>}</div><p>Interested in {opened.subject.toLowerCase()}. Explore their sample posts in this preview.</p><div className={styles.profilePostsLabel}>POSTS IN THIS PREVIEW</div>{posts.filter((post) => post.handle === opened.handle).map((post) => <div className={styles.profilePost} key={post.id}><span>{post.time} · {post.subject}</span><p>{post.text}</p><button onClick={() => { setOpened(post); setDialogView("discussion"); }}>View discussion <ArrowRight size={14} /></button></div>)}</div> : dialogView === "reader" && opened.resource ? <div className={styles.readerSample}>
            <div className={styles.readerLabel}><FileText size={15} /> SAMPLE READING VIEW <span>1 / 1</span></div>
            <div className={styles.readerPaper}><span>{opened.resource.type}</span><h3>{opened.resource.title}</h3><p>{opened.resource.note}</p><div className={styles.readerRule} /><p>This sample shows how a resource could feel inside the feed. A secure PDF reader, page navigation and real document content will be connected in a later phase.</p></div>
            <button className={styles.readerSave} aria-pressed={saved.includes(opened.id)} onClick={() => toggle(opened.id, setSaved)}><Bookmark size={15} fill={saved.includes(opened.id) ? "currentColor" : "none"} /> {saved.includes(opened.id) ? "Saved to your library" : "Save to your library"}</button>
          </div> : <div className={styles.discussion}>
            <p className={styles.discussionPost}>{opened.text}</p>
            <div className={styles.discussionLabel}>DISCUSSION <span>PREVIEW ONLY</span></div>
            {[...(sampleReplies[opened.id] ?? []), ...(replies[opened.id] ?? [])].length === 0 ? <p className={styles.discussionEmpty}>No replies yet. Add one to start the conversation.</p> : [...(sampleReplies[opened.id] ?? []), ...(replies[opened.id] ?? [])].map((reply, index) => <div className={styles.reply} key={`${opened.id}-${index}`}><Avatar initials={reply.initials} color={reply.color} size="small" /><div><strong>{reply.name} <span>· {reply.time}</span></strong><p>{reply.text}</p></div></div>)}
            <form className={styles.replyForm} onSubmit={(event) => { event.preventDefault(); const text = replyDraft.trim(); if (!text) return; setReplies((current) => ({ ...current, [opened.id]: [...(current[opened.id] ?? []), { name: "You", initials: "YO", color: "sage", time: "just now", text }] })); setReplyDraft(""); }}>
              <label className={styles.srOnly} htmlFor="reply">Write a sample reply</label><input id="reply" value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} maxLength={500} placeholder="Add to the conversation" /><button disabled={!replyDraft.trim()}>Reply</button>
            </form>
          </div>}
          <div className={styles.modalNote}>Design preview only. Sample posts, saves and replies are not published and reset when you refresh.</div>
        </section>
      </div>}
    </div>
  );
}
