"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import styles from "./feed.module.css";

export function FeedProfileAvatar({ name, avatarUrl, post = false }: { name: string; avatarUrl: string | null; post?: boolean }) {
  return <Avatar className={post ? styles.postAvatar : styles.profileAvatar} aria-hidden="true">
    {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
    <AvatarFallback className={post ? styles.postAvatarFallback : styles.profileFallback}>{getInitials(name || "User")}</AvatarFallback>
  </Avatar>;
}
