"use client";

import { useEffect, useState, useRef } from "react";
import { useUIStore } from "@/stores/index";
import { absoluteUrl } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { usePusherChannel } from "@/hooks/usePusher";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";

// ─────────────────────────────────────────────────────────────────────────────
// SHARE MODAL
// Plan spec: copy link (clipboard API, toast on copy), QR code (qrcode library),
// social share links (WhatsApp, Telegram, Twitter/X, LinkedIn, Email)
// ─────────────────────────────────────────────────────────────────────────────

export function ShareModal() {
  const documentId    = useUIStore((s) => s.shareModalDocumentId);
  const closeModal    = useUIStore((s) => s.setShareModalDocumentId);
  const addToast      = useUIStore((s) => s.addToast);
  const { copied, copy } = useCopyToClipboard(2500);
  const [qrDataUrl,   setQrDataUrl]   = useState<string | null>(null);
  const [qrLoading,   setQrLoading]   = useState(false);
  const overlayRef    = useRef<HTMLDivElement>(null);

  // Real-time channel for document events
  const { bind } = usePusherChannel(CHANNELS.privateDocument(documentId || ""));

  const isOpen  = !!documentId;
  const shareUrl= documentId
    ? absoluteUrl(`/d/${documentId}`)  // documentId is actually slug in our store
    : "";

  // Generate QR code when modal opens
  useEffect(() => {
    if (!isOpen || !shareUrl) return;
    setQrDataUrl(null);
    setQrLoading(true);

    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(shareUrl, {
        width:          220,
        margin:         2,
        color: {
          dark:   "#F1F5F9",  // light pixels (our text color)
          light:  "#111D3A",  // dark pixels (our card bg)
        },
      })
        .then((url) => { setQrDataUrl(url); setQrLoading(false); })
        .catch(() => setQrLoading(false));
    });
  }, [isOpen, shareUrl]);

  // Listen for real-time updates to share counts
  useEffect(() => {
    if (!isOpen || !documentId) return;

    const unbindReaction = bind(EVENTS.REACTION_UPDATED, (data: any) => {
      if (data.documentId === documentId) {
        // Update share count display if needed (could add analytics tracking)
        console.log("Share modal received reaction update:", data);
      }
    });

    const unbindView = bind(EVENTS.VIEW_COUNT_UPDATED, (data: any) => {
      if (data.documentId === documentId) {
        console.log("Share modal received view count update:", data);
      }
    });

    return () => {
      unbindReaction();
      unbindView();
    };
  }, [isOpen, documentId, bind]);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closeModal(null);
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeModal]);

  async function copyLink() {
    const success = await copy(shareUrl);
    if (success) {
      addToast({ type: "success", title: "Link copied to clipboard!" });
    } else {
      addToast({ type: "error", title: "Failed to copy -- please copy manually" });
    }
  }

  if (!isOpen) return null;

  const encodedUrl  = encodeURIComponent(shareUrl);
  const encodedTitle= encodeURIComponent("Check out this document on getpidief");

  const socials = [
    {
      label: "WhatsApp",
      icon:  "💬",
      color: "#25D366",
      href:  `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: "Telegram",
      icon:  "✈️",
      color: "#2AABEE",
      href:  `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "Twitter / X",
      icon:  "𝕏",
      color: "#1DA1F2",
      href:  `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      icon:  "in",
      color: "#0A66C2",
      href:  `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "Email",
      icon:  "✉️",
      color: "#6B7280",
      href:  `mailto:?subject=${encodedTitle}&body=${encodedTitle}%0A%0A${encodedUrl}`,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleBackdrop}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="fixed z-[501] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-full max-w-[460px] bg-card border border-border rounded-2xl shadow-xl
                   animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 id="share-modal-title" className="font-heading font-semibold text-foreground text-base">
            Share this resource
          </h2>
          <button
            onClick={() => closeModal(null)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                       hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Copy link */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 h-9 px-3 bg-secondary border border-border rounded-lg
                           text-xs text-muted-foreground font-mono select-all outline-none
                           focus:border-ring"
                aria-label="Share URL"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copyLink}
                className={cn(
                  "h-9 px-4 rounded-lg text-xs font-medium shrink-0 transition-all duration-150",
                  copied
                    ? "bg-[var(--emerald)] text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">QR Code</p>
            <div className="flex justify-center p-4 bg-[#111D3A] rounded-xl border border-border">
              {qrLoading ? (
                <div className="w-[220px] h-[220px] flex items-center justify-center">
                  <svg className="animate-spin w-8 h-8 text-muted-foreground" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                    <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR code to share this document"
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center text-muted-foreground text-xs">
                  QR code unavailable
                </div>
              )}
            </div>
          </div>

          {/* Social share */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Share via</p>
            <div className="grid grid-cols-5 gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Share on ${s.label}`}
                  title={s.label}
                  className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-secondary
                             border border-border hover:border-ring/40 transition-all duration-150
                             hover:-translate-y-0.5 text-center"
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="text-[9px] text-muted-foreground">{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}