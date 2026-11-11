"use client";

import { useServiceWorker } from "@/hooks/useServiceWorker";
import { Download, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ServiceWorkerUpdate() {
  const { isSupported, isRegistered, updateAvailable, applyUpdate } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || !isRegistered || !updateAvailable || dismissed) {
    return null;
  }

  const handleApplyUpdate = () => {
    applyUpdate();
    toast.success("Updating application...");
  };

  const handleDismiss = () => {
    setDismissed(true);
    toast.info("Update available. Refresh to apply.");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-void p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <Download className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm">Update Available</h3>
          <p className="text-xs text-muted-foreground mt-1">
            A new version of getpidief is available with improvements and bug fixes.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApplyUpdate}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
