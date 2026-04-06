import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  uploadDocumentSchema,
  createCommentSchema,
  updateProfileSchema,
  searchQuerySchema,
  changePasswordSchema,
  moderateDocumentSchema,
} from "@/lib/validations/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "test@uct.ac.za", password: "Password1!" });
    expect(result.success).toBe(true);
  });
  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "notanemail", password: "Password1!" });
    expect(result.success).toBe(false);
  });
  it("rejects short password", () => {
    const result = loginSchema.safeParse({ email: "test@uct.ac.za", password: "abc" });
    expect(result.success).toBe(false);
  });
  it("lowercases email", () => {
    const result = loginSchema.safeParse({ email: "TEST@UCT.AC.ZA", password: "Password1!" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("test@uct.ac.za");
  });
});

describe("registerSchema", () => {
  const valid = {
    firstName: "Jane",
    lastName:  "Doe",
    email:     "jane@uct.ac.za",
    password:       "Password1!",
    confirmPassword:"Password1!",
    acceptTerms:    true,
  };

  it("accepts valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects when passwords don't match", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "Different1!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
    }
  });
  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({ ...valid, password: "password1!", confirmPassword: "password1!" });
    expect(result.success).toBe(false);
  });
  it("rejects password without number", () => {
    const result = registerSchema.safeParse({ ...valid, password: "Password!", confirmPassword: "Password!" });
    expect(result.success).toBe(false);
  });
  it("rejects when terms not accepted", () => {
    const result = registerSchema.safeParse({ ...valid, acceptTerms: false });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@uni.edu" }).success).toBe(true);
  });
  it("rejects invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const valid = { token: "abc123", password: "NewPassword1!", confirmPassword: "NewPassword1!" };
  it("accepts valid reset", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects mismatched passwords", () => {
    expect(resetPasswordSchema.safeParse({ ...valid, confirmPassword: "Different1!" }).success).toBe(false);
  });
  it("rejects missing token", () => {
    expect(resetPasswordSchema.safeParse({ ...valid, token: "" }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

describe("onboardingStep1Schema", () => {
  it("accepts valid UUID", () => {
    const result = onboardingStep1Schema.safeParse({ institutionId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });
  it("rejects non-UUID", () => {
    expect(onboardingStep1Schema.safeParse({ institutionId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("onboardingStep2Schema", () => {
  it("accepts valid academic focus", () => {
    const result = onboardingStep2Schema.safeParse({
      faculty: "Engineering", major: "Computer Science", academicLevel: "undergraduate",
    });
    expect(result.success).toBe(true);
  });
  it("rejects empty faculty", () => {
    const result = onboardingStep2Schema.safeParse({
      faculty: "", major: "CS", academicLevel: "undergraduate",
    });
    expect(result.success).toBe(false);
  });
  it("rejects invalid academic level", () => {
    const result = onboardingStep2Schema.safeParse({
      faculty: "Eng", major: "CS", academicLevel: "invalid_level",
    });
    expect(result.success).toBe(false);
  });
});

describe("onboardingStep3Schema", () => {
  const validUUIDs = [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
  ];
  it("accepts 3+ valid UUIDs", () => {
    expect(onboardingStep3Schema.safeParse({ tagIds: validUUIDs }).success).toBe(true);
  });
  it("rejects fewer than 3 tags", () => {
    expect(onboardingStep3Schema.safeParse({ tagIds: validUUIDs.slice(0, 2) }).success).toBe(false);
  });
  it("rejects empty array", () => {
    expect(onboardingStep3Schema.safeParse({ tagIds: [] }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

describe("uploadDocumentSchema", () => {
  const valid = {
    title:        "CS201 Past Exam 2023",
    fileUrl:      "https://example.com/file.pdf",
    fileSize:     1_000_000,
    categoryId:   "550e8400-e29b-41d4-a716-446655440000",
    resourceType: "past_exam",
    institutionId:"550e8400-e29b-41d4-a716-446655440001",
  };

  it("accepts valid upload", () => {
    expect(uploadDocumentSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects title too short", () => {
    expect(uploadDocumentSchema.safeParse({ ...valid, title: "Hi" }).success).toBe(false);
  });
  it("rejects file exceeding 50MB", () => {
    expect(uploadDocumentSchema.safeParse({ ...valid, fileSize: 51 * 1024 * 1024 }).success).toBe(false);
  });
  it("rejects invalid resource type", () => {
    expect(uploadDocumentSchema.safeParse({ ...valid, resourceType: "invalid" }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

describe("createCommentSchema", () => {
  const docId = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid comment", () => {
    expect(createCommentSchema.safeParse({ documentId: docId, content: "Great notes!" }).success).toBe(true);
  });
  it("rejects empty content", () => {
    expect(createCommentSchema.safeParse({ documentId: docId, content: "" }).success).toBe(false);
  });
  it("rejects content over 2000 chars", () => {
    expect(createCommentSchema.safeParse({ documentId: docId, content: "x".repeat(2001) }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

describe("updateProfileSchema", () => {
  it("accepts partial update", () => {
    expect(updateProfileSchema.safeParse({ displayName: "Jane Doe" }).success).toBe(true);
  });
  it("accepts empty object (all optional)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });
  it("rejects invalid username characters", () => {
    expect(updateProfileSchema.safeParse({ username: "jane doe!" }).success).toBe(false);
  });
  it("accepts valid username", () => {
    expect(updateProfileSchema.safeParse({ username: "jane_doe_99" }).success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  const valid = { currentPassword: "OldPassword1!", newPassword: "NewPassword1!", confirmNewPassword: "NewPassword1!" };
  it("accepts valid change", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects mismatched new passwords", () => {
    expect(changePasswordSchema.safeParse({ ...valid, confirmNewPassword: "Different1!" }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

describe("searchQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = searchQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(25);
      expect(result.data.sort).toBe("relevance");
    }
  });
  it("coerces string page to number", () => {
    const result = searchQuerySchema.safeParse({ page: "2", limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });
  it("rejects page below 1", () => {
    expect(searchQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
  it("rejects limit over 50", () => {
    expect(searchQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

describe("moderateDocumentSchema", () => {
  const docId = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts approve action", () => {
    expect(moderateDocumentSchema.safeParse({ documentId: docId, action: "approve" }).success).toBe(true);
  });
  it("accepts reject with reasons", () => {
    const result = moderateDocumentSchema.safeParse({
      documentId: docId,
      action: "reject",
      rejectionReasons: ["low_quality_scan"],
      rejectionNote: "Illegible scan",
    });
    expect(result.success).toBe(true);
  });
  it("rejects invalid action", () => {
    expect(moderateDocumentSchema.safeParse({ documentId: docId, action: "delete" }).success).toBe(false);
  });
});