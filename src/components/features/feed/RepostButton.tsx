"use client";
import { InstantReaction } from "./InstantReaction";
export function RepostButton({ postId, author, initiallyReposted, count }: { postId: string; author: string; initiallyReposted: boolean; count: number }) {
  return <InstantReaction kind="repost" postId={postId} author={author} initialActive={initiallyReposted} count={count} />;
}
