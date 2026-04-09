"use client";

import { useSession as useNextAuthSession } from "next-auth/react";
import type { UserRole, ReputationLevel } from "@/types/index";

// ─────────────────────────────────────────────────────────────────────────────
// TYPED SESSION USER SHAPE
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id:                  string;
  email:               string;
  name:                string | null;
  image:               string | null;
  // Extended profile
  role:                UserRole;
  status:              "active" | "suspended" | "pending_verification" | "deactivated";
  username:            string;
  displayName:         string;
  avatarUrl:           string | null;
  onboardingComplete:  boolean;
  verificationStatus:  "unverified" | "pending" | "verified" | "rejected";
  reputationScore:     number;
  reputationLevel:     ReputationLevel;
  institutionId:       string | null;
}

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface UseSessionReturn {
  user:            SessionUser | null;
  status:          SessionStatus;
  isLoading:       boolean;
  isAuthenticated: boolean;
  isAdmin:         boolean;
  isModerator:     boolean;
  isContributor:   boolean;
  isVerified:      boolean;
  update:          (data?: Partial<SessionUser>) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// useSession HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Client-side session hook with typed user shape and convenience helpers.
 * Drop-in replacement for next-auth's useSession — use this everywhere.
 *
 * @example
 * const { user, isAuthenticated, isAdmin } = useSession();
 */
export function useSession(): UseSessionReturn {
  const { data: session, status, update } = useNextAuthSession();

  const user = session?.user ? (session.user as unknown as SessionUser) : null;

  return {
    user,
    status,
    isLoading:       status === "loading",
    isAuthenticated: status === "authenticated" && !!user,
    isAdmin:         ["admin", "super_admin"].includes(user?.role ?? ""),
    isModerator:     ["moderator", "admin", "super_admin"].includes(user?.role ?? ""),
    isContributor:   ["contributor", "moderator", "admin", "super_admin"].includes(user?.role ?? ""),
    isVerified:      user?.verificationStatus === "verified",
    update:          async (data?: Partial<SessionUser>) => {
      await update(data);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRequireAuth HOOK — redirects to login if not authenticated
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Use in client components that require authentication.
 * Automatically redirects to /login if the session is unauthenticated.
 *
 * @example
 * const { user } = useRequireAuth();
 */
export function useRequireAuth(): UseSessionReturn {
  const session = useSession();
  const router  = useRouter();

  useEffect(() => {
    if (!session.isLoading && !session.isAuthenticated) {
      router.push("/login");
    }
  }, [session.isLoading, session.isAuthenticated, router]);

  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// useOptionalSession — does NOT redirect, just returns null if not auth'd
// For public pages that show different UI depending on auth state
// ─────────────────────────────────────────────────────────────────────────────

export function useOptionalSession(): Pick<UseSessionReturn, "user" | "isLoading" | "isAuthenticated"> {
  const { user, isLoading, isAuthenticated } = useSession();
  return { user, isLoading, isAuthenticated };
}
