"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useUIStore } from "@/stores/index";
import { cn } from "@/lib/utils/cn";
import { usePusherChannel } from "@/hooks/usePusher";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";

// ─────────────────────────────────────────────────────────────────────────────
// REPORT MODAL
// Plan spec: reason multi-select + optional note + submit
// → creates report record + Pusher event to admin channel
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { value: "low_quality_scan",     label: "Low quality scan or illegible" },
  { value: "copyright_violation",  label: "Copyright or IP violation"     },
  { value: "incorrect_category",   label: "Wrong category or metadata"    },
  { value: "duplicate_submission", label: "Duplicate document"             },
  { value: "inappropriate_content",label: "Inappropriate content"          },
  { value: "insufficient_metadata",label: "Missing or insufficient metadata"},
  { value: "spam",                 label: "Spam or promotional content"    },
  { value: "misinformation",       label: "Inaccurate or misleading"       },
  { value: "other",                label: "Other (please explain below)"   },
] as const;

type ReasonValue = typeof REPORT_REASONS[number]["value"];

export function ReportModal() {
  const documentId  = useUIStore((s) => s.reportModalDocumentId);
  const closeModal  = useUIStore((s) => s.setReportModalDocumentId);
  const addToast    = useUIStore((s) => s.addToast);
  const overlayRef  = useRef<HTMLDivElement>(null);

  const [selectedReasons, setSelectedReasons] = useState<Set<ReasonValue>>(new Set());
  const [additionalInfo,  setAdditionalInfo]  = useState("");
  const [submitted,       setSubmitted]       = useState(false);
  const [isPending, start] = useTransition();

  const isOpen = !!documentId;

  // Real-time admin channel for report notifications
  const { bind } = usePusherChannel(CHANNELS.ADMIN);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedReasons(new Set());
      setAdditionalInfo("");
      setSubmitted(false);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeModal]);

  function toggleReason(value: ReasonValue) {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closeModal(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedReasons.size === 0) {
      addToast({ type: "error", title: "Please select at least one reason" });
      return;
    }

    start(async () => {
      try {
        const res = await fetch("/api/reports", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            documentId:     documentId,
            reasons:        [...selectedReasons],
            additionalInfo: additionalInfo.trim() || undefined,
          }),
        });

        if (res.status === 409) {
          addToast({ type: "info", title: "You have already reported this document" });
          closeModal(null);
          return;
        }

        if (!res.ok) throw new Error("Report failed");

        setSubmitted(true);
      } catch {
        addToast({ type: "error", title: "Failed to submit report. Please try again." });
      }
    });
  }

  if (!isOpen) return null;

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
        aria-labelledby="report-modal-title"
        className="fixed z-[501] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-full max-w-[480px] bg-card border border-border rounded-2xl shadow-xl
                   animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <h2 id="report-modal-title" className="font-heading font-semibold text-foreground text-base">
            Report Document
          </h2>
          <button
            onClick={() => closeModal(null)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <SuccessState onClose={() => closeModal(null)} />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Help us keep the archive accurate and high-quality. Select all issues that apply.
              </p>

              {/* Reason checkboxes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Reason(s) for report
                </p>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
                        "border transition-all duration-150",
                        selectedReasons.has(value)
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-border hover:bg-secondary/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReasons.has(value)}
                        onChange={() => toggleReason(value)}
                        className="w-4 h-4 rounded accent-destructive cursor-pointer shrink-0"
                      />
                      <span className="text-sm text-foreground leading-snug">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional info */}
              <div className="space-y-1.5">
                <label htmlFor="additional-info" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Additional information
                  <span className="normal-case font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  id="additional-info"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Provide any additional context that would help our moderation team…"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm
                             text-foreground placeholder:text-muted-foreground resize-none outline-none
                             focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                />
                <p className="text-xs text-muted-foreground text-right">{additionalInfo.length}/500</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0 gap-3">
              <button
                type="button"
                onClick={() => closeModal(null)}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground
                           border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || selectedReasons.size === 0}
                className={cn(
                  "px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                  "bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                      <path d="M7 2a5 5 0 015 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Submitting…
                  </span>
                ) : (
                  `Submit Report${selectedReasons.size > 0 ? ` (${selectedReasons.size})` : ""}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--emerald-subtle)] border border-[var(--emerald)]/20
                      flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[var(--emerald)]" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M7 12l3.5 3.5L17 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className="space-y-1.5">
        <h3 className="font-heading font-semibold text-foreground text-lg">Report submitted.</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Thank you. Our moderation team will review this document within 24 hours.
        </p>
      </div>

      <button
        onClick={onClose}
        className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                   hover:bg-primary/90 transition-colors"
      >
        Done
      </button>
    </div>
  );
}