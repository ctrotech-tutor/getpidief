"use server";

import { signIn, signOut } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { authUsers, authAccounts, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/schemas";
import { rateLimiters } from "@/lib/redis/client";
import { redis, KEYS, TTL } from "@/lib/redis/client";
import { resend, EMAIL_FROM } from "@/lib/email/client";
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
  } catch (error: any) {
    if (error?.type === "CredentialsSignin") {
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
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
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

  const { firstName, lastName, email, password } = parsed.data;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  // Check if email already exists
  const existing = await db.query.authUsers.findFirst({
    where: eq(authUsers.email, email),
    columns: { id: true },
  });
  if (existing) return actionError("An account with this email already exists.", "email");

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create auth user
  const [authUser] = await db
    .insert(authUsers)
    .values({ name: fullName, email })
    .returning({ id: authUsers.id });

  if (!authUser) return actionError("Failed to create account. Please try again.");

  // Create credentials account (password stored in providerAccountId)
  await db.insert(authAccounts).values({
    userId:            authUser.id,
    type:              "credentials",
    provider:          "credentials",
    providerAccountId: passwordHash,
  });

  // Trigger user/registered event (creates profile, sends welcome email)
  await inngest.send({
    name: "user/registered",
    data: { userId: authUser.id, email, name: fullName, provider: "email" },
  });

  // Send email verification
  await inngest.send({
    name: "email/verification",
    data: { email, name: fullName, token: await createEmailVerifyToken(authUser.id, email) },
  });

  return actionSuccess({ message: "Account created! Check your email to verify." });
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

    // Store token in Redis with 15-minute TTL
    await redis.setex(
      KEYS.passwordResetToken(token),
      TTL.passwordResetToken,
      authUser.id
    );

    await inngest.send({
      name: "email/password-reset",
      data: {
        email,
        token:     rawToken, // raw token goes in the email link
        name:      authUser.name ?? "Scholar",
        ipAddress: (await headers()).get("x-forwarded-for") ?? "unknown",
      },
    });
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

  // Hash token to look up in Redis
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const userId    = await redis.get<string>(KEYS.passwordResetToken(tokenHash));

  if (!userId) return actionError("This reset link has expired or already been used.");

  // Update password
  const newHash = await bcrypt.hash(password, 12);
  await db
    .update(authAccounts)
    .set({ providerAccountId: newHash })
    .where(
      and(
        eq(authAccounts.userId, userId),
        eq(authAccounts.provider, "credentials")
      )
    );

  // Invalidate token
  await redis.del(KEYS.passwordResetToken(tokenHash));

  return actionSuccess({ message: "Password updated successfully. You can now sign in." });
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function createEmailVerifyToken(userId: string, email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await redis.setex(
    KEYS.emailVerifyToken(token),
    TTL.emailVerifyToken,
    JSON.stringify({ userId, email })
  );
  return token;
}
