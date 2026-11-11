"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { formatFileSize } from "@/lib/utils/format";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = ["application/pdf"];

interface UploadDropzoneProps {
  onFile:    (file: File) => void;
  isUploading?: boolean;
  progress?:    number;
  uploadedUrl?: string | null;
  error?:       string | null;
  className?:   string;
}

export function UploadDropzone({
  onFile,
  isUploading = false,
  progress    = 0,
  uploadedUrl = null,
  error       = null,
  className,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError,  setFileError]  = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF files are accepted";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. Maximum size is ${formatFileSize(MAX_SIZE_BYTES)}`;
    }
    return null;
  }, []);

  const handleFile = useCallback((file: File) => {
    const err = validate(file);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setSelectedFile(file);
    onFile(file);
  }, [validate, onFile]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const displayError = fileError || error;

  // ── Uploaded state ──────────────────────────────────────────────────────
  if (uploadedUrl) {
    return (
      <div className={cn(
        "flex items-center gap-4 p-5 rounded-2xl border",
        "border-[var(--emerald)]/30 bg-[var(--emerald-subtle)]",
        className
      )}>
        <div className="w-12 h-12 rounded-xl bg-[var(--emerald)]/15 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-[var(--emerald)]" aria-hidden>
            <path d="M7 11l3 3L15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--emerald)]">File uploaded!</p>
          {selectedFile && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedFile.name} · {formatFileSize(selectedFile.size)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Change file
        </button>
      </div>
    );
  }

  // ── Uploading state ─────────────────────────────────────────────────────
  if (isUploading) {
    return (
      <div className={cn(
        "flex flex-col items-center gap-4 p-8 rounded-2xl border border-primary/20 bg-primary/5",
        className
      )}>
        <svg className="animate-spin w-10 h-10 text-primary" viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
          <path d="M16 4a12 12 0 0112 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        {selectedFile && (
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
        )}
        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  // ── Default / drag-over state ───────────────────────────────────────────
  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center gap-4 p-10 rounded-2xl border-2 border-dashed",
          "cursor-pointer select-none transition-all duration-200",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : displayError
            ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
            : "border-border hover:border-ring/50 hover:bg-secondary/30"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
          isDragOver ? "bg-primary/15" : "bg-secondary"
        )}>
          {isDragOver ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary" aria-hidden>
              <path d="M14 20V8M8 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-muted-foreground" aria-hidden>
              <rect x="5" y="3" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M9 9h10M9 13h10M9 17h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="20" cy="20" r="5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M20 17.5v5M17.5 20h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <p className="text-base font-semibold text-foreground">
            {isDragOver ? "Drop your PDF here" : "Drag & drop your PDF"}
          </p>
          <p className="text-sm text-muted-foreground">
            or <span className="text-primary font-medium">browse files</span>
          </p>
          <p className="text-xs text-muted-foreground">
            PDF only · Maximum {formatFileSize(MAX_SIZE_BYTES)}
          </p>
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden
        />
      </div>

      {displayError && (
        <p role="alert" className="text-xs text-destructive flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M6 3.5V6M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {displayError}
        </p>
      )}
    </div>
  );
}
