"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  isUnstable: boolean;
  lastChecked: number;
}

export function NetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isSlow: false,
    isUnstable: false,
    lastChecked: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    let stabilityTimeout: NodeJS.Timeout | undefined;
    let connectionTests = 0;
    let failedTests = 0;

    const testConnection = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        const endTime = Date.now();
        
        connectionTests++;
        
        if (!response.ok) {
          failedTests++;
        }
        
        const isSlow = (endTime - startTime) > 3000;
        const isUnstable = connectionTests > 0 && (failedTests / connectionTests) > 0.3;
        
        setStatus(prev => ({
          ...prev,
          isOnline: true,
          isSlow,
          isUnstable,
          lastChecked: Date.now(),
        }));

        // Show status if there are issues
        if (isSlow || isUnstable) {
          setIsVisible(true);
          setTimeout(() => setIsVisible(false), 5000);
        }
      } catch (error) {
        failedTests++;
        setStatus(prev => ({
          ...prev,
          isOnline: false,
          isUnstable: true,
          lastChecked: Date.now(),
        }));
        setIsVisible(true);
      }
    };

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      testConnection();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
      setIsVisible(true);
    };

    // Initial check
    testConnection();

    // Set up periodic checks
    checkInterval = setInterval(testConnection, 30000); // Check every 30 seconds

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(stabilityTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isVisible && status.isOnline && !status.isSlow && !status.isUnstable) {
    return null;
  }

  const getStatusIcon = () => {
    if (!status.isOnline) return <WifiOff className="h-4 w-4" />;
    if (status.isUnstable) return <AlertTriangle className="h-4 w-4" />;
    if (status.isSlow) return <Loader2 className="h-4 w-4 animate-spin" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (!status.isOnline) return "text-red-500 bg-red-50 border-red-200";
    if (status.isUnstable) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (status.isSlow) return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getStatusMessage = () => {
    if (!status.isOnline) return "No internet connection";
    if (status.isUnstable) return "Unstable connection";
    if (status.isSlow) return "Slow connection";
    return "Connected";
  };

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-300",
        getStatusColor(),
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      )}
    >
      {getStatusIcon()}
      <span>{getStatusMessage()}</span>
      <button
        onClick={() => setIsVisible(false)}
        className="ml-2 text-xs opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
