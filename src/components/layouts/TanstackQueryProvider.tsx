"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

// Network error detection and retry logic
function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  const err = error as any;
  return (
    err?.code === 'NETWORK_ERROR' ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ECONNREFUSED' ||
    err?.message?.includes('fetch') ||
    err?.message?.includes('network') ||
    err?.message?.includes('timeout') ||
    !navigator.onLine
  );
}

// Exponential backoff with jitter for retries
function getRetryDelay(failureCount: number): number {
  const baseDelay = Math.min(1000 * Math.pow(2, failureCount), 30000);
  const jitter = Math.random() * 0.3 * baseDelay;
  return baseDelay + jitter;
}

// Circuit breaker state
const circuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  resetTimeout: 60000, // 1 minute
  maxFailures: 5,
};

function shouldCircuitBreakerOpen(): boolean {
  const now = Date.now();
  
  if (circuitBreakerState.isOpen) {
    if (now - circuitBreakerState.lastFailureTime > circuitBreakerState.resetTimeout) {
      circuitBreakerState.isOpen = false;
      circuitBreakerState.failures = 0;
      return false;
    }
    return true;
  }
  
  return false;
}

function recordCircuitBreakerFailure(): void {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failures >= circuitBreakerState.maxFailures) {
    circuitBreakerState.isOpen = true;
  }
}

export function TanstackQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error) => {
              // Don't retry if circuit breaker is open
              if (shouldCircuitBreakerOpen()) {
                return false;
              }
              
              // Retry network errors up to 3 times
              if (isNetworkError(error) && failureCount < 3) {
                return true;
              }
              
              // Retry 5xx errors up to 2 times
              const err = error as any;
              if (err?.status >= 500 && failureCount < 2) {
                return true;
              }
              
              return false;
            },
            retryDelay: (failureCount) => getRetryDelay(failureCount),
            refetchOnWindowFocus: false,
            refetchOnReconnect: 'always',
            networkMode: 'online',
          },
          mutations: {
            retry: (failureCount, error) => {
              // Don't retry if circuit breaker is open
              if (shouldCircuitBreakerOpen()) {
                return false;
              }
              
              // Retry network errors up to 2 times
              if (isNetworkError(error) && failureCount < 2) {
                return true;
              }
              
              return false;
            },
            retryDelay: (failureCount) => getRetryDelay(failureCount),
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}