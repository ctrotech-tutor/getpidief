"use server";

import { signIn, signOut } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { authUsers, authAccounts, users, accountAgreements } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/schemas";
import { rateLimiters } from "@/lib/redis/client";
import { redis, redisRateLimit, KEYS, TTL } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import { actionSuccess, actionError, type ActionResult } from "@/lib/utils/api";
import { headers } from "next/headers";

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN (Google)
// ─────────────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/explore" });
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN (Email + Password)
// ─────────────────────────────────────────────────────────────────────────────

export async function signInWithCredentials(
  _: ActionResult<{ redirectTo: string }>,
  formData: FormData
): Promise<ActionResult<{ redirectTo: string }>> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  // Rate limit by IP
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const { success: ok } = await rateLimiters.login.limit(ip);
  if (!ok) return actionError("Too many login attempts. Please wait 1 minute.");

  try {
    await signIn("credentials", {
      email:      email?.toLowerCase(),
      password,
      redirect:   false,
    });
    return actionSuccess({ redirectTo: "/explore" });
  } catch (error: unknown) {
    const authError = error as { type?: string };
    if (authError.type === "CredentialsSignin") {
      return actionError("Invalid email or password.", "email");
    }
    return actionError("Something went wrong. Please try again.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────

export async function registerWithCredentials(
  _: ActionResult<{ message: string }>,
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  if (process.env.NODE_ENV === "production" && !redisRateLimit) return actionError("Account creation is temporarily unavailable. Please try again later.");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success: ok } = await rateLimiters.register.limit(ip);
  if (!ok) return actionError("Too many registration attempts. Please wait.");

  const raw = {
    firstName:             formData.get("firstName"),
    lastName:              formData.get("lastName"),
    email:                 formData.get("email"),
    password:              formData.get("password"),
    confirmPassword:       formData.get("confirmPassword"),
    acceptTerms:           formData.get("acceptTerms") === "on",
    isAcademicResearcher:  formData.get("isAcademicResearcher") === "on",
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return actionError(firstError ?? "Invalid form data.");
  }

  const { firstName, lastName, email, password, isAcademicResearcher } = parsed.data;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  if (!redis) return actionError("Account creation is temporarily unavailable. Please try again later.");

  // A single transaction prevents half-created accounts and records the actual
  // agreement and optional self-description alongside the credential profile.
  const passwordHash = await bcrypt.hash(password, 12);
  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      const [authUser] = await tx.insert(authUsers).values({ name: fullName, email }).returning({ id: authUsers.id });
      await tx.insert(authAccounts).values({ userId: authUser.id, type: "credentials", provider: "credentials", providerAccountId: passwordHash });
      await tx.insert(users).values({ id: authUser.id, username: `learner_${authUser.id.replaceAll("-", "").slice(0, 24)}`, displayName: fullName });
      await tx.insert(accountAgreements).values({ userId: authUser.id, termsVersion: "legacy-2024", privacyVersion: "legacy-2024", isAcademicResearcherOrStudent: Boolean(isAcademicResearcher) });
      return authUser.id;
    });
  } catch (error) {
    const databaseError = (error as { cause?: { code?: string; constraint?: string } }).cause;
    if (databaseError?.code === "23505" && ["auth_users_email_unique", "auth_users_email_idx"].includes(databaseError.constraint ?? "")) return actionError("An account with this email already exists.", "email");
    // Drizzle errors may contain query parameters, including email and hashes.
    console.error("[Auth] Account creation failed");
    return actionError("Account creation is temporarily unavailable. Please try again.");
  }

  // Delivery is asynchronous. If dispatch fails, the account remains usable via
  // the resend flow rather than being incorrectly reported as not created.
  let verificationRequested = false;
  try {
    await inngest.send({ name: "email/send-verification", data: { userId, email, name: fullName } });
    verificationRequested = true;
  } catch { console.error("[Auth] Verification dispatch failed"); }
  try { await inngest.send({ name: "user/registered", data: { userId, email, name: fullName, provider: "email" } }); }
  catch { console.error("[Auth] Welcome dispatch failed"); }
  return actionSuccess({ message: verificationRequested
    ? "Account created. If the verification email does not arrive, request another from the login page."
    : "Account created, but we could not request a verification email. Please request another from the login page." });

}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

export async function requestPasswordReset(
  _: ActionResult<{ message: string }>,
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  const emailRaw = formData.get("email") as string;
  const parsed   = forgotPasswordSchema.safeParse({ email: emailRaw });
  if (!parsed.success) return actionError("Please enter a valid email address.");

  const { email } = parsed.data;
  if (!redis || (process.env.NODE_ENV === "production" && !redisRateLimit)) return actionError("Password reset is temporarily unavailable. Please try again later.");

  // Rate limit
  const { success: ok } = await rateLimiters.passwordReset.limit(email);
  if (!ok) return actionError("Too many requests. Please wait 15 minutes.");

  // Always return success to prevent email enumeration
  const authUser = await db.query.authUsers.findFirst({
    where: eq(authUsers.email, email),
    columns: { id: true, name: true },
  });

  if (authUser) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const token    = crypto.createHash("sha256").update(rawToken).digest("hex");

    try {
      await redis.setex(KEYS.passwordResetToken(token), TTL.passwordResetToken, authUser.id);
    } catch {
      return actionError("Password reset is temporarily unavailable. Please try again later.");
    }

    try { await inngest.send({
      name: "email/password-reset",
      data: {
        email,
        token:     rawToken, // raw token goes in the email link
        name:      authUser.name ?? "Scholar",
        ipAddress: (await headers()).get("x-forwarded-for") ?? "unknown",
      },
    }); } catch {
      // Do not distinguish existing and non-existing accounts to the requester.
      console.error("[Auth] Password reset dispatch failed");
    }
  }

  return actionSuccess({
    message: "If an account exists for this email, a reset link has been sent.",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

export async function resetPassword(
  _: ActionResult<{ message: string }>,
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  const parsed = resetPasswordSchema.safeParse({
    token:           formData.get("token"),
    password:        formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return actionError(
      Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Invalid data."
    );
  }

  const { token: rawToken, password } = parsed.data;

  if (!redis) return actionError("Password reset is temporarily unavailable. Please request a new link later.");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  let userId: string | null;
  try { userId = await redis.getdel<string>(KEYS.passwordResetToken(tokenHash)); }
  catch { return actionError("Password reset is temporarily unavailable. Please request a new link later."); }
  if (!userId) return actionError("This reset link has expired or already been used.");

  try {
    const newHash = await bcrypt.hash(password, 12);
    const updated = await db.transaction(async (tx) => {
      const accounts = await tx.update(authAccounts).set({ providerAccountId: newHash })
        .where(and(eq(authAccounts.userId, userId), eq(authAccounts.provider, "credentials")))
        .returning({ userId: authAccounts.userId });
      if (accounts.length) await tx.update(authUsers).set({ sessionVersion: sql`${authUsers.sessionVersion} + 1` }).where(eq(authUsers.id, userId));
      return accounts;
    });
    if (!updated.length) return actionError("This account does not have a password. Please use your original sign-in method.");
  } catch {
    return actionError("We could not update your password. Please request a new link.");
  }

  return actionSuccess({ message: "Password updated successfully. You can now sign in." });
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}


export async function verifyEmailAddress(
  _: ActionResult<{ message: string }>,
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  const token = formData.get("token");
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(token)) return actionError("This verification link is invalid.");
  if (!redis) return actionError("Verification is temporarily unavailable. Please try again later.");
  let stored: unknown;
  try { stored = await redis.getdel(KEYS.emailVerifyToken(token)); }
  catch { return actionError("Verification is temporarily unavailable. Please try again later."); }
  if (!stored) return actionError("This link has expired or already been used. Request a new one from the sign-in page.");
  let data: { userId?: string; email?: string };
  try { data = typeof stored === "string" ? JSON.parse(stored) : stored as typeof data; }
  catch { return actionError("This verification link is invalid."); }
  if (!data?.userId || !data.email) return actionError("This verification link is invalid.");
  try {
    const updated = await db.update(authUsers).set({ emailVerified: new Date() })
      .where(and(eq(authUsers.id, data.userId), eq(authUsers.email, data.email)))
      .returning({ id: authUsers.id });
    if (!updated.length) return actionError("This verification link is invalid.");
  } catch {
    return actionError("We could not verify this account. Please request a new link.");
  }
  return actionSuccess({ message: "Your email is verified. You can now sign in." });
}
