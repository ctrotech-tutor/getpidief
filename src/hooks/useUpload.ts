"use client";

import { useCallback } from "react";
import { useUploadStore } from "@/stores/index";
import { useUIStore } from "@/stores/index";
// UploadThing types - using dynamic import to avoid type issues

/**
 * Upload hook using Uploadthing + upload queue store.
 * Handles file validation, progress tracking, and completion.
 */
export function useUpload() {
  const { uploads, addUpload, updateUpload, removeUpload, clearCompleted } = useUploadStore();
  const addToast = useUIStore((s) => s.addToast);

  const upload = useCallback(
    async (file: File): Promise<{ url: string; key: string } | null> => {
      // Basic validation
      if (file.type !== "application/pdf") {
        addToast({ type: "error", title: "Only PDF files are supported" });
        return null;
      }
      if (file.size > 50 * 1024 * 1024) {
        addToast({ type: "error", title: "File must be under 50MB" });
        return null;
      }

      const uploadId = addUpload(file);
      updateUpload(uploadId, { status: "uploading", progress: 0 });

      try {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result || !result.url) throw new Error("Upload failed - invalid response");

        updateUpload(uploadId, {
          status: "complete",
          progress: 100,
          uploadedUrl: result.url,
        });

        addToast({ type: "success", title: "File uploaded successfully" });
        return { url: result.url, key: result.key || "" };

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Upload failed";
        updateUpload(uploadId, {
          status: "error",
          error: message,
        });
        addToast({ type: "error", title: "Upload failed", description: message });
        return null;
      }
    },
    [addUpload, updateUpload, addToast]
  );

  const activeUploads   = uploads.filter((u) => u.status === "uploading");
  const completedCount  = uploads.filter((u) => u.status === "complete").length;
  const hasErrors       = uploads.some((u) => u.status === "error");
  const isUploading     = activeUploads.length > 0;

  return {
    upload,
    uploads,
    activeUploads,
    isUploading,
    completedCount,
    hasErrors,
    removeUpload,
    clearCompleted,
  };
}