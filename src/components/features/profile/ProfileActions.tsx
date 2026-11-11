"use client";

import { useState, useTransition, useEffect } from "react";
import { useUIStore } from "@/stores/index";
import { useSession } from "@/hooks/useSession";
import { useSocial } from "@/hooks/useSocial";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

interface ProfileActionsProps {
  profileId: string;
  username: string;
  displayName: string;
  isFollowing: boolean;
  followerCount: number;
  documentCount: number;
}

export function ProfileActions({
  profileId,
  username,
  displayName,
  isFollowing,
  followerCount,
  documentCount,
}: ProfileActionsProps) {
  const { isAuthenticated } = useSession();
  const setShareModal = useUIStore((s) => s.setShareModalDocumentId);
  const setReportModal = useUIStore((s) => s.setReportModalDocumentId);
  const addToast = useUIStore((s) => s.addToast);
  const { shareToClipboard, generateSocialLinks } = useSocial();
  const [isPending, startTransition] = useTransition();
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");

  const shareText = `Check out ${displayName}'s profile on getpidief - ${documentCount} documents, ${followerCount} followers`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setProfileUrl(`${window.location.origin}/u/${username}`);
    }
  }, [username]);

  async function handleShareProfile() {
    const success = await shareToClipboard({ url: profileUrl, title: shareText });
    if (success) {
      addToast({ type: "success", title: "Profile link copied to clipboard!" });
    } else {
      addToast({ type: "error", title: "Failed to copy link" });
    }
  }

  async function handleSocialShare(platform: string) {
    const socialLinks = generateSocialLinks({ url: profileUrl, title: shareText });
    const link = socialLinks.find(s => s.label.toLowerCase() === platform.toLowerCase());
    if (link) {
      window.open(link.href, "_blank", "noopener,noreferrer");
      addToast({ type: "success", title: `Opening ${platform}...` });
    }
  }

  function handleReportProfile() {
    if (!isAuthenticated) {
      addToast({ type: "error", title: "Please sign in to report profiles" });
      return;
    }
    setReportModal(profileId);
  }

  const socialLinks = generateSocialLinks({ url: profileUrl, title: shareText });

  return (
    <div className="space-y-2">
      {/* Share Button */}
      <button
        onClick={handleShareProfile}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl
                   border border-border text-sm font-medium text-foreground
                   hover:bg-secondary transition-colors disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
        Share Profile
      </button>

      {/* Share Options Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl
                     border border-border text-sm font-medium text-foreground
                     hover:bg-secondary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
          Share to Social
        </button>

        {showShareOptions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 p-2">
            {socialLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleSocialShare(link.label)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground
                           hover:bg-secondary transition-colors"
              >
                <span style={{ color: link.color }}>{link.label[0]}</span>
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Report Button */}
      <button
        onClick={handleReportProfile}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl
                   border border-red-200 text-sm font-medium text-red-600
                   hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M3 10l9-7 9 7M12 4v10" />
        </svg>
        Report Profile
      </button>

      {/* Stats Preview */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Documents</span>
          <span className="font-medium text-foreground">{formatNumber(documentCount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Followers</span>
          <span className="font-medium text-foreground">{formatNumber(followerCount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-medium text-foreground">{isFollowing ? "Following" : "Not Following"}</span>
        </div>
      </div>
    </div>
  );
}
