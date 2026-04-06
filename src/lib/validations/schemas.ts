import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255)
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50).trim(),
    lastName: z.string().min(1, "Last name is required").max(50).trim(),
    email: z.string().email("Invalid email").max(255).toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .max(72)
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[0-9]/, "Must include a number")
      .regex(/[^A-Za-z0-9]/, "Must include a special character"),
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, "You must accept the terms"),
    isAcademicResearcher: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email").toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .max(72)
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[0-9]/, "Must include a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const onboardingStep1Schema = z.object({
  institutionId: z.string().uuid("Please select a valid institution"),
});

export const onboardingStep2Schema = z.object({
  faculty: z.string().min(1, "Please select your faculty").max(150),
  major: z.string().min(1, "Please enter your major/programme").max(150),
  academicLevel: z.enum([
    "undergraduate",
    "postgraduate",
    "doctorate",
    "professional",
    "other",
  ]),
  academicYear: z.number().int().min(1).max(10).optional(),
  isContributor: z.boolean().optional(),
});

export const onboardingStep3Schema = z.object({
  tagIds: z
    .array(z.string().uuid())
    .min(3, "Please select at least 3 interests")
    .max(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const uploadDocumentSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(500, "Title cannot exceed 500 characters")
    .trim(),
  description: z.string().max(800).optional(),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024), // 50MB
  categoryId: z.string().uuid("Please select a category"),
  resourceType: z.enum([
    "past_exam", "lecture_notes", "research_paper", "textbook_summary",
    "assignment", "tutorial_sheet", "course_guide", "lab_report",
    "thesis", "dissertation", "other",
  ]),
  institutionId: z.string().uuid("Please select your institution"),
  academicYear: z
    .number()
    .int()
    .min(2000)
    .max(new Date().getFullYear() + 1)
    .optional(),
  semester: z
    .enum([
      "semester_1", "semester_2", "full_year",
      "term_1", "term_2", "term_3",
      "trimester_1", "trimester_2", "trimester_3",
    ])
    .optional(),
  language: z.string().min(2).max(10).default("en"),
  courseCodes: z.array(z.string().max(50)).max(10).optional(),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
  tagNames: z.array(z.string().min(1).max(100)).max(10).optional(), // new tags
  visibility: z.enum(["public", "institution", "private"]).default("public"),
  license: z.enum([
    "academic_use_only", "cc_by", "cc_by_sa", "cc_by_nc",
    "cc_by_nc_sa", "all_rights_reserved",
  ]).default("academic_use_only"),
  allowDownload: z.boolean().default(true),
  allowPrint: z.boolean().default(true),
});

export const updateDocumentSchema = uploadDocumentSchema.partial().omit({
  fileUrl: true,
  fileSize: true,
});

export const documentReportSchema = z.object({
  documentId: z.string().uuid(),
  reasons: z
    .array(
      z.enum([
        "low_quality_scan", "copyright_violation", "incorrect_category",
        "duplicate_submission", "inappropriate_content", "insufficient_metadata",
        "spam", "misinformation", "other",
      ])
    )
    .min(1, "Please select at least one reason"),
  additionalInfo: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  documentId: z.string().uuid(),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment cannot exceed 2000 characters")
    .trim(),
  parentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z
    .string()
    .min(1)
    .max(2000)
    .trim(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).trim().optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores"
    )
    .optional(),
  bio: z.string().max(500).optional().nullable(),
  externalLinks: z
    .object({
      linkedin: z.string().url().optional().nullable(),
      researchgate: z.string().url().optional().nullable(),
      orcid: z.string().optional().nullable(),
      twitter: z.string().optional().nullable(),
      website: z.string().url().optional().nullable(),
      institutional: z.string().url().optional().nullable(),
    })
    .optional(),
});

export const updateAcademicProfileSchema = z.object({
  institutionId: z.string().uuid().optional(),
  faculty: z.string().max(150).optional(),
  major: z.string().max(150).optional(),
  department: z.string().max(150).optional(),
  academicLevel: z
    .enum(["undergraduate", "postgraduate", "doctorate", "professional", "other"])
    .optional(),
  academicYear: z.number().int().min(1).max(10).optional(),
  graduationYear: z.number().int().min(2000).max(2050).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z
      .string()
      .min(8, "Minimum 8 characters")
      .max(72)
      .regex(/[A-Z]/, "Must include uppercase")
      .regex(/[0-9]/, "Must include a number"),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const updatePrivacySchema = z.object({
  profileVisibility: z.enum(["public", "institution", "private"]).optional(),
  showInstitution: z.boolean().optional(),
  showLibrary: z.boolean().optional(),
  showActivityInPulse: z.boolean().optional(),
  allowMessages: z.boolean().optional(),
});

export const updateNotificationPrefsSchema = z.object({
  like_inapp: z.boolean().optional(),
  like_email: z.boolean().optional(),
  like_push: z.boolean().optional(),
  comment_inapp: z.boolean().optional(),
  comment_email: z.boolean().optional(),
  comment_push: z.boolean().optional(),
  follow_inapp: z.boolean().optional(),
  follow_email: z.boolean().optional(),
  follow_push: z.boolean().optional(),
  approved_inapp: z.boolean().optional(),
  approved_email: z.boolean().optional(),
  approved_push: z.boolean().optional(),
  rejected_inapp: z.boolean().optional(),
  rejected_email: z.boolean().optional(),
  new_upload_inapp: z.boolean().optional(),
  new_upload_email: z.boolean().optional(),
  new_upload_push: z.boolean().optional(),
  badge_inapp: z.boolean().optional(),
  badge_email: z.boolean().optional(),
  badge_push: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
  system_inapp: z.boolean().optional(),
  system_email: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKMARK / COLLECTION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(150).trim(),
  description: z.string().max(400).optional(),
  visibility: z.enum(["public", "institution", "private"]).default("private"),
});

export const addBookmarkSchema = z.object({
  documentId: z.string().uuid(),
  collectionId: z.string().uuid().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const moderateDocumentSchema = z.object({
  documentId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  rejectionReasons: z
    .array(
      z.enum([
        "low_quality_scan", "copyright_violation", "incorrect_category",
        "duplicate_submission", "inappropriate_content", "insufficient_metadata",
        "spam", "misinformation", "other",
      ])
    )
    .optional(),
  rejectionNote: z.string().max(500).optional(),
});

export const changeUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["student", "contributor", "moderator", "admin"]),
  reason: z.string().max(300).optional(),
});

export const suspendUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1).max(500),
  durationHours: z.enum(["24", "72", "168", "permanent"]),
  notifyUser: z.boolean().default(true),
});

export const createInstitutionSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  shortName: z.string().max(100).optional(),
  country: z.string().min(2).max(100),
  countryCode: z.string().length(2).toUpperCase(),
  city: z.string().max(100).optional(),
  type: z.enum([
    "university", "college", "institute", "polytechnic",
    "academy", "school", "research_center", "other",
  ]),
  websiteUrl: z.string().url().optional(),
  emailDomains: z.array(z.string()).max(10).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(150).trim(),
  description: z.string().max(400).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const searchQuerySchema = z.object({
  q: z.string().max(200).default(""),
  category: z.string().uuid().optional(),
  institution: z.string().uuid().optional(),
  type: z.string().optional(),
  yearFrom: z.coerce.number().int().min(2000).optional(),
  yearTo: z.coerce.number().int().max(2100).optional(),
  verified: z.coerce.boolean().optional(),
  language: z.string().max(10).optional(),
  sort: z.enum(["relevance", "recent", "downloads", "likes", "discussed"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ModerateDocumentInput = z.infer<typeof moderateDocumentSchema>;
