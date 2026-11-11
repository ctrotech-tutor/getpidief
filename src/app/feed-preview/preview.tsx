"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Bookmark, Check, Compass, FileText, GraduationCap, Heart, Home, Library, MessageCircle, Plus, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import styles from "./preview.module.css";

type Post = {
  id: string; name: string; handle: string; initials: string; color: string; time: string;
  subject: string; text: string; likes: number; comments: number; following?: boolean;
  resource?: { title: string; type: string; detail: string; note: string };
};

const initialPosts: Post[] = [
  { id: "p1", name: "Nia Okafor", handle: "nia.studies", initials: "NO", color: "peach", time: "2h ago", subject: "BIOLOGY", following: true, text: "I made a visual guide to cell signalling for my revision. Sharing it here in case it helps someone else make sense of the pathways.", likes: 128, comments: 18, resource: { title: "Cell signalling, made a little clearer", type: "STUDY NOTES", detail: "12 pages  ·  Biology", note: "A visual walkthrough of receptors, second messengers and the pathways that connect them." } },
  { id: "p2", name: "Daniel Kim", handle: "daniellearns", initials: "DK", color: "blue", time: "4h ago", subject: "MATHS", following: true, text: "What finally made integration click for you? I understand the rules, but I still struggle to see when to use each method.", likes: 46, comments: 23 },
  { id: "p3", name: "Amara Ellis", handle: "amara.reads", initials: "AE", color: "lavender", time: "Yesterday", subject: "LITERATURE", text: "A few notes from my reading this week. I keep coming back to the idea that the setting can tell us as much as the narrator does.", likes: 84, comments: 9, resource: { title: "Reading between the lines", type: "READING GUIDE", detail: "8 pages  ·  Literature", note: "A short guide to noticing point of view, setting and the details that shape a story." } },
];
const subjects = ["Biology", "Mathematics", "Design", "Psychology", "Literature"];

function Avatar({ initials, color, size = "normal" }: { initials: string; color: string; size?: "normal" | "small" }) {
  return <span aria-hidden="true" className={`${styles.avatar} ${styles[color]} ${size === "small" ? styles.avatarSmall : ""}`}>{initials}</span>;
}

export function FeedPreview() {
  const [tab, setTab] = useState<"For you" | "Following">("For you");
  const [posts, setPosts] = useState(initialPosts);
  const [likes, setLikes] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [following, setFollowing] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [opened, setOpened] = useState<Post | null>(null);
  const [message, setMessage] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [dialogView, setDialogView] = useState<"reader" | "discussion">("discussion");
  const [replies, setReplies] = useState<Record<string, string[]>>({});
  const [replyDraft, setReplyDraft] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!opened) return;
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
  }, [opened]);
  const visiblePosts = useMemo(() => posts.filter((post) => (showSaved ? saved.includes(post.id) : (tab === "For you" || post.following)) && `${post.text} ${post.subject} ${post.name} ${post.resource?.title ?? ""}`.toLowerCase().includes(query.toLowerCase().trim())), [posts, query, tab, showSaved, saved]);
  const toggle = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const addPost = () => {
    if (!draft.trim()) return;
    setPosts((current) => [{ id: `draft-${Date.now()}`, name: "You", handle: "your.preview", initials: "YO", color: "sage", time: "Just now", subject: "YOUR POST", text: draft.trim(), likes: 0, comments: 0, following: true }, ...current]);
    setDraft(""); setTab("For you"); setShowSaved(false); setQuery(""); setMessage("Added to this preview only. It will disappear when you refresh.");
  };
  return (
    <div className={styles.app}>
      <div className={styles.previewBar}><span><span className={styles.previewDot} /> DESIGN PREVIEW</span><span>Sample content and interactions. Nothing is published.</span><Link href="/">Back to homepage <ArrowRight size={13} /></Link></div>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Preview navigation">
          <Link className={styles.brand} href="/"><span className={styles.brandMark}><span>g</span><i /></span><span>getpidief<span className={styles.brandPeriod}>.</span><small>THE STUDY NETWORK</small></span></Link>
          <div className={styles.sideLabel}>YOUR SPACE</div>
          <nav className={styles.sideNav}><a className={!showSaved ? styles.activeNav : ""} href="#feed" onClick={() => { setShowSaved(false); setQuery(""); }}><Home size={19} strokeWidth={1.7} /> Home <span className={styles.navDot} /></a><a href="#discover"><Compass size={19} strokeWidth={1.7} /> Discover</a><a className={showSaved ? styles.activeNav : ""} href="#feed" onClick={() => { setShowSaved(true); setQuery(""); }}> <Library size={19} strokeWidth={1.7} /> Your library</a></nav>
          <div className={styles.sideDivider} />
          <div className={styles.sideLabel}>YOUR INTERESTS <span>EXAMPLE</span></div>
          <div className={styles.interestList}>{subjects.slice(0, 4).map((subject, index) => <button key={subject} onClick={() => { setQuery(subject === "Mathematics" ? "maths" : subject); setTab("For you"); }}><span className={`${styles.interestIcon} ${styles[`interest${index}`]}`}>#</span>{subject}</button>)}</div>
          <button className={styles.sidebarCreate} onClick={() => document.getElementById("compose")?.focus()}><Plus size={18} /> Create a post</button>
          <div className={styles.sidebarBottom}><div className={styles.miniBrand}>A LITTLE SPACE<br /><strong>FOR BIG IDEAS.</strong></div><span>Made for curious minds, everywhere.</span></div>
        </aside>

        <main className={styles.main} id="feed">
          <header className={styles.header}><div><span className={styles.headerEyebrow}>YOUR STUDY SPACE <span>✳</span></span><h1>Good to see you here<span>.</span></h1><p>A little inspiration for whatever you&apos;re learning.</p></div><div className={styles.headerRight}><span className={styles.dateLabel}>A SPACE TO LEARN<br /><strong>TOGETHER, EVERY DAY</strong></span><Avatar initials="YO" color="sage" /></div></header>
          <section className={styles.intro}><div><div className={styles.introKicker}><span /> YOUR CORNER OF THE INTERNET</div><h2>Good ideas<br /><em>are better shared.</em></h2><p>Notes, questions, and the people who make learning a little less lonely.</p><a href="#compose">Share something <ArrowRight size={15} /></a></div><div className={styles.introArt} aria-hidden="true"><span className={styles.artOrbit} /><span className={styles.artPage}><i /><i /><i /><b>good<br />to know.</b></span><span className={styles.artStar}>✳</span><span className={styles.artNote}>PASS IT ON ↗</span></div></section>
          <div className={styles.feedHeading}><div><div className={styles.sectionKicker}>THE GOOD STUFF <span>✳</span></div><h2>{showSaved ? "Saved posts" : "Your feed"}<span>.</span></h2></div><div className={styles.feedHeadingNote}>A mix of fresh ideas<br />and familiar faces.</div></div>
          <div className={styles.tabs}><div role="tablist" aria-label="Feed view">{(["For you", "Following"] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? styles.selectedTab : ""} onClick={() => { setShowSaved(false); setTab(item); }}>{item}</button>)}</div><span><SlidersHorizontal size={14} /> YOUR FEED</span></div>
          <section className={styles.composer} aria-label="Sample post composer"><Avatar initials="YO" color="sage" /><div className={styles.composerBody}><label className={styles.srOnly} htmlFor="compose">Write a sample post</label><textarea id="compose" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What have you been learning?" maxLength={500} /><div className={styles.composerFooter}><span><Sparkles size={15} /> Share a thought or a question</span><button onClick={addPost} disabled={!draft.trim()}>Post <ArrowRight size={14} /></button></div></div></section>
          {message && <div className={styles.notice} role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss message"><X size={15} /></button></div>}
          <div className={styles.posts}>{visiblePosts.length === 0 ? <div className={styles.empty}><strong>Nothing here yet.</strong><p>{showSaved ? "Save a post and it will appear here in this preview." : "Try another search or check the For you feed."}</p></div> : visiblePosts.map((post) => <article className={styles.post} key={post.id}>
            <div className={styles.postHeader}><Avatar initials={post.initials} color={post.color} /><div className={styles.postIdentity}><strong>{post.name}</strong><span>@{post.handle} <i>·</i> {post.time}</span></div><span className={styles.postTopic}>{post.subject}</span></div>
            <p className={styles.postText}>{post.text}</p>
            {post.resource && <button className={styles.resource} onClick={() => { setDialogView("reader"); setReplyDraft(""); setOpened(post); }}><span className={styles.resourceCover}><span className={styles.coverLines}>≋<br />≋<br />≋</span><FileText size={18} /></span><span className={styles.resourceText}><span>{post.resource.type}</span><strong>{post.resource.title}</strong><small>{post.resource.detail}</small></span><span className={styles.resourceArrow}><ArrowDownRight size={17} /></span></button>}
            <div className={styles.postActions}><button onClick={() => toggle(post.id, setLikes)} aria-pressed={likes.includes(post.id)} className={likes.includes(post.id) ? styles.liked : ""}><Heart size={17} fill={likes.includes(post.id) ? "currentColor" : "none"} /> {post.likes + (likes.includes(post.id) ? 1 : 0)}</button><button onClick={() => { setDialogView("discussion"); setReplyDraft(""); setOpened(post); }}><MessageCircle size={17} /> {post.comments + (replies[post.id]?.length ?? 0)} <span>replies</span></button><button className={styles.saveAction} aria-pressed={saved.includes(post.id)} aria-label={saved.includes(post.id) ? "Remove from sample library" : "Save to sample library"} onClick={() => toggle(post.id, setSaved)}><Bookmark size={17} fill={saved.includes(post.id) ? "currentColor" : "none"} /> <span>{saved.includes(post.id) ? "Saved" : "Save"}</span></button></div>
          </article>)}</div>
          <footer className={styles.feedFooter}>A LITTLE CURIOSITY GOES A LONG WAY <span>✳</span></footer>
        </main>

        <aside className={styles.rightbar} id="discover"><label className={styles.search}><Search size={18} /><span className={styles.srOnly}>Search sample posts</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the preview" /></label><div className={styles.rightTop}><span>THE STUDY EDIT</span><span>ISSUE 001 / PREVIEW</span></div><section className={styles.discoverCard}><div className={styles.cardHeading}><div><span className={styles.sectionKicker}>FIND YOUR PEOPLE</span><h2>Curious minds<span>.</span></h2></div><span className={styles.smallStar}>✳</span></div><p>A few people you might like learning with.</p><div className={styles.person}><Avatar initials="SL" color="yellow" size="small" /><div><strong>Samira Lee</strong><span>Design &amp; research</span></div><button onClick={() => setFollowing(!following)} aria-pressed={following}>{following ? <><Check size={13} /> Following</> : <><Plus size={13} /> Follow</>}</button></div><div className={styles.person}><Avatar initials="JM" color="blue" size="small" /><div><strong>Jules Morgan</strong><span>Psychology student</span></div><span className={styles.personTag}>EXAMPLE</span></div><div className={styles.cardFoot}>GOOD PEOPLE. GOOD IDEAS. <ArrowRight size={15} /></div></section>
          <section className={styles.topicsCard}><div className={styles.cardHeading}><div><span className={styles.sectionKicker}>GO DOWN A RABBIT HOLE</span><h2>Explore a little<span>.</span></h2></div><Compass size={20} strokeWidth={1.3} /></div><p>Find your next favourite subject.</p><div className={styles.topicChips}>{subjects.map((subject) => <button key={subject} onClick={() => { setQuery(subject === "Mathematics" ? "maths" : subject); setTab("For you"); }}># {subject}</button>)}</div></section>
          <section className={styles.libraryCard} id="library"><div className={styles.libraryIcon}><Bookmark size={18} /></div><span>KEEP THE GOOD STUFF</span><h2>Make it yours.</h2><p>Save the things you want to come back to. Your preview library has {saved.length} {saved.length === 1 ? "item" : "items"}.</p><button onClick={() => { setShowSaved(true); setQuery(""); document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" }); }}>Your saved posts <ArrowRight size={15} /></button></section>
          <div className={styles.rightFooter}><span>GETPIDIEF © PREVIEW</span><span>FOR THE CURIOUS ✳</span></div>
        </aside>
      </div>
      <nav className={styles.mobileNav} aria-label="Mobile preview navigation"><a href="#feed" onClick={() => { setShowSaved(false); setQuery(""); }}><Home size={21} /><span>Home</span></a><a href="#discover"><Compass size={21} /><span>Discover</span></a><button onClick={() => document.getElementById("compose")?.focus()} aria-label="Create a sample post"><Plus size={24} /></button><a href="#feed" onClick={() => { setShowSaved(true); setQuery(""); }}><Bookmark size={21} /><span>Saved</span></a><Link href="/"><GraduationCap size={21} /><span>Home page</span></Link></nav>
      {opened && <div className={styles.modalBackdrop} onClick={() => setOpened(null)}>
        <section ref={dialogRef} className={`${styles.modal} ${styles.detailModal}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
          <button className={styles.modalClose} onClick={() => setOpened(null)} aria-label="Close"><X size={20} /></button>
          <span className={styles.sectionKicker}>SAMPLE {opened.resource ? "RESOURCE" : "CONVERSATION"}</span>
          <h2 id="modal-title">{opened.resource?.title ?? "The conversation"}</h2>
          <p className={styles.detailByline}>Shared by {opened.name} <span>·</span> {opened.subject.toLowerCase()}</p>
          <div className={styles.detailTabs}>
            {opened.resource && <button aria-pressed={dialogView === "reader"} onClick={() => setDialogView("reader")}>Read</button>}
            <button aria-pressed={dialogView === "discussion"} onClick={() => setDialogView("discussion")}>Discussion</button>
          </div>
          {dialogView === "reader" && opened.resource ? <div className={styles.readerSample}>
            <div className={styles.readerLabel}><FileText size={15} /> SAMPLE READING VIEW <span>1 / 1</span></div>
            <div className={styles.readerPaper}><span>{opened.resource.type}</span><h3>{opened.resource.title}</h3><p>{opened.resource.note}</p><div className={styles.readerRule} /><p>This sample shows how a resource could feel inside the feed. A secure PDF reader, page navigation and real document content will be connected in a later phase.</p></div>
            <button className={styles.readerSave} aria-pressed={saved.includes(opened.id)} onClick={() => toggle(opened.id, setSaved)}><Bookmark size={15} fill={saved.includes(opened.id) ? "currentColor" : "none"} /> {saved.includes(opened.id) ? "Saved to your library" : "Save to your library"}</button>
          </div> : <div className={styles.discussion}>
            <p className={styles.discussionPost}>{opened.text}</p>
            <div className={styles.discussionLabel}>DISCUSSION <span>PREVIEW ONLY</span></div>
            {(replies[opened.id] ?? []).length === 0 ? <p className={styles.discussionEmpty}>Add a sample reply to explore the conversation.</p> : (replies[opened.id] ?? []).map((reply, index) => <div className={styles.reply} key={`${opened.id}-${index}`}><Avatar initials="YO" color="sage" size="small" /><div><strong>You <span>· just now</span></strong><p>{reply}</p></div></div>)}
            <form className={styles.replyForm} onSubmit={(event) => { event.preventDefault(); const text = replyDraft.trim(); if (!text) return; setReplies((current) => ({ ...current, [opened.id]: [...(current[opened.id] ?? []), text] })); setReplyDraft(""); }}>
              <label className={styles.srOnly} htmlFor="reply">Write a sample reply</label><input id="reply" value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} maxLength={500} placeholder="Add to the conversation" /><button disabled={!replyDraft.trim()}>Reply</button>
            </form>
          </div>}
          <div className={styles.modalNote}>Design preview only. Sample posts, saves and replies are not published and reset when you refresh.</div>
        </section>
      </div>}
    </div>
  );
}
