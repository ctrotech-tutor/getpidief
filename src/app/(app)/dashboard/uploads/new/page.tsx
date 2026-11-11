"use client";

import { useState, useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import { UploadDropzone } from "@/components/features/upload/UploadDropzone";
import { UploadForm } from "@/components/features/upload/UploadForm";
import { useUIStore } from "@/stores/index";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// These are fetched server-side but we need client state for the upload flow.
// The page is a client component that loads initial data via fetch.
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadNewPage() {
  const { user } = useSession();
  const addToast = useUIStore((s) => s.addToast);

  const [step,         setStep]         = useState<"drop" | "form" | "success">("drop");
  const [uploadedUrl,  setUploadedUrl]  = useState<string | null>(null);
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [isUploading,  setIsUploading]  = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [uploadError,  setUploadError]  = useState<string | null>(null);
  const [submittedSlug,setSubmittedSlug]= useState<string | null>(null);

  // Categories + institutions — loaded once
  const [categories,   setCategories]   = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [dataLoaded,   setDataLoaded]   = useState(false);

  // Load categories + institutions when component mounts
  useState(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/institutions").then((r) => r.json()),
    ]).then(([cats, insts]) => {
      setCategories(cats.data ?? []);
      setInstitutions(insts.data ?? []);
      setDataLoaded(true);
    }).catch(() => setDataLoaded(true));
  });

  const handleFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setProgress(0);

    try {
      // Simulate progress ticks while uploading
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 15, 85));
      }, 400);

      // Use the Uploadthing endpoint
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body:   formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Upload failed");
      }

      const json = await res.json();
      const url  = json.data?.url ?? json.url;

      if (!url) throw new Error("No URL returned from upload");

      setProgress(100);
      setUploadedUrl(url);
      setUploadedSize(file.size);

      // Slight delay before showing form
      setTimeout(() => setStep("form"), 600);

    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed. Please try again.");
      addToast({ type: "error", title: err.message ?? "Upload failed" });
    } finally {
      setIsUploading(false);
    }
  }, [addToast]);

  // ── Success state ─────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-[var(--emerald-subtle)] border border-[var(--emerald)]/20
                        flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-[var(--emerald)]" aria-hidden>
            <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M11 18l5 5L25 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="font-heading font-bold text-foreground text-2xl tracking-tight mb-2">
            Document submitted!
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your document is under review. Our moderation team will approve it within 24 hours.
            You'll receive a notification once it's live.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/uploads"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                       hover:bg-primary/90 transition-colors"
          >
            View My Uploads
          </Link>
          <button
            onClick={() => {
              setStep("drop");
              setUploadedUrl(null);
              setUploadedSize(0);
              setProgress(0);
            }}
            className="px-5 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium
                       hover:bg-secondary transition-colors"
          >
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/uploads"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div>
          <h1 className="font-heading font-bold text-foreground text-xl tracking-tight">
            Upload Document
          </h1>
          <p className="text-sm text-muted-foreground">
            Contribute to the archive — earn reputation and help fellow scholars.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["Select File", "Add Metadata"].map((label, i) => {
          const isActive = (i === 0 && step === "drop") || (i === 1 && step === "form");
          const isDone   = i === 0 && step === "form";
          return (
            <div key={label} className="flex items-center gap-2 text-xs font-medium">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                isDone   ? "bg-primary text-primary-foreground" :
                isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                           "bg-secondary border border-border text-muted-foreground"
              )}>
                {isDone ? "✓" : i + 1}
              </div>
              <span className={isActive ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              {i === 0 && <div className="w-6 h-px bg-border mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: File drop */}
      {step === "drop" && (
        <UploadDropzone
          onFile={handleFile}
          isUploading={isUploading}
          progress={progress}
          uploadedUrl={uploadedUrl}
          error={uploadError}
        />
      )}

      {/* Step 2: Metadata form */}
      {step === "form" && uploadedUrl && dataLoaded && (
        <UploadForm
          fileUrl={uploadedUrl}
          fileSize={uploadedSize}
          categories={categories}
          institutions={institutions}
          userInstitutionId={user?.institutionId}
          onSuccess={(slug) => {
            setSubmittedSlug(slug);
            setStep("success");
          }}
        />
      )}
      {step === "form" && !dataLoaded && (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading form…</div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
