"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import styles from "./feed.module.css";

export function FeedProfileAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return <Avatar className={styles.profileAvatar} aria-hidden="true">
    {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
    <AvatarFallback className={styles.profileFallback}>{getInitials(name || "User")}</AvatarFallback>
  </Avatar>;
}
