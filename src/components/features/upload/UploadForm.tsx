"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { TagInput } from "./TagInput";
import { cn } from "@/lib/utils/cn";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// ── Form schema ───────────────────────────────────────────────────────────────
const uploadFormSchema = z.object({
  title:        z.string().min(5, "Title must be at least 5 characters").max(200),
  description:  z.string().max(2000).optional(),
  categoryId:   z.string().uuid("Please select a category"),
  resourceType: z.enum([
    "past_exam","lecture_notes","research_paper","textbook_summary",
    "assignment","tutorial_sheet","thesis","dissertation","other",
  ], { message: "Please select a resource type" }),
  institutionId:z.string().uuid("Please select your institution"),
  academicYear: z.coerce.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  semester:     z.enum(["semester_1","semester_2","semester_3","annual","other"]).optional(),
  language:     z.string().default("en"),
  visibility:   z.enum(["public","institution","private"]).default("public"),
  license:      z.enum(["cc_by","cc_by_sa","cc_by_nc","all_rights_reserved","public_domain"]).default("cc_by"),
  allowDownload:z.boolean().default(true),
  allowPrint:   z.boolean().default(true),
  tags:         z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })).max(10).default([]),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

const RESOURCE_TYPE_OPTIONS = [
  { value: "past_exam",        label: "Past Exam"          },
  { value: "lecture_notes",    label: "Lecture Notes"      },
  { value: "research_paper",   label: "Research Paper"     },
  { value: "textbook_summary", label: "Textbook Summary"   },
  { value: "assignment",       label: "Assignment"         },
  { value: "tutorial_sheet",   label: "Tutorial Sheet"     },
  { value: "thesis",           label: "Thesis"             },
  { value: "dissertation",     label: "Dissertation"       },
  { value: "other",            label: "Other"              },
] as const;

const LANGUAGES = [
  { value: "en", label: "English"    },
  { value: "fr", label: "French"     },
  { value: "ar", label: "Arabic"     },
  { value: "es", label: "Spanish"    },
  { value: "pt", label: "Portuguese" },
  { value: "sw", label: "Swahili"    },
];

const LICENSES = [
  { value: "cc_by",              label: "CC BY - Attribution"                       },
  { value: "cc_by_sa",           label: "CC BY-SA - Attribution + ShareAlike"       },
  { value: "cc_by_nc",           label: "CC BY-NC - Attribution, Non-Commercial"    },
  { value: "all_rights_reserved",label: "All Rights Reserved"                       },
  { value: "public_domain",      label: "Public Domain"                             },
];

interface UploadFormProps {
  uploadId:       string;
  categories:     { id: string; name: string; color: string }[];
  institutions:   { id: string; name: string; countryCode: string }[];
  userInstitutionId?: string | null;
  onSuccess?:     (slug: string) => void;
}

export function UploadForm({
  uploadId,
  categories,
  institutions,
  userInstitutionId,
  onSuccess,
}: UploadFormProps) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft, clearDraft] = useLocalStorage<Partial<UploadFormValues>>("upload_draft", {});

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title:         savedDraft?.title         ?? "",
      description:   savedDraft?.description   ?? "",
      categoryId:    savedDraft?.categoryId    ?? "",
      resourceType:  savedDraft?.resourceType  ?? undefined,
      institutionId: savedDraft?.institutionId ?? userInstitutionId ?? "",
      language:      savedDraft?.language      ?? "en",
      visibility:    "public",
      license:       savedDraft?.license       ?? "cc_by",
      allowDownload: savedDraft?.allowDownload ?? true,
      allowPrint:    savedDraft?.allowPrint    ?? true,
      tags:          savedDraft?.tags          ?? [],
    },
  });

  const formValues = watch();

  // Debounced draft auto-save every 5s
  useEffect(() => {
    const t = setTimeout(() => {
      if (isDirty) {
        setSavedDraft({
          title:         formValues.title,
          description:   formValues.description,
          categoryId:    formValues.categoryId,
          resourceType:  formValues.resourceType,
          institutionId: formValues.institutionId,
          language:      formValues.language,
          visibility:    formValues.visibility,
          license:       formValues.license,
          allowDownload: formValues.allowDownload,
          allowPrint:    formValues.allowPrint,
          tags:          formValues.tags,
        });
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [formValues, isDirty, setSavedDraft]);

  async function onSubmit(data: any) {
    setSubmitError(null);
    start(async () => {
      try {
        const tagIds   = data.tags.filter((t: any) => !t.id.startsWith("new:")).map((t: any) => t.id);
        const tagNames = data.tags.filter((t: any) =>  t.id.startsWith("new:")).map((t: any) => t.name);

        const res = await fetch("/api/documents", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            title:         data.title,
            description:   data.description,
            uploadId,
            categoryId:    data.categoryId,
            resourceType:  data.resourceType,
            institutionId: data.institutionId,
            academicYear:  data.academicYear,
            semester:      data.semester,
            language:      data.language,
            visibility:    data.visibility,
            license:       data.license,
            allowDownload: data.allowDownload,
            allowPrint:    data.allowPrint,
            tagIds,
            tagNames,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setSubmitError(json.error?.message ?? "Failed to submit document");
          return;
        }

        clearDraft();
        onSuccess?.(json.data.slug);
        router.push(`/dashboard/uploads?submitted=1`);
      } catch {
        setSubmitError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Draft notice */}
      {savedDraft?.title && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl
                        bg-[var(--amber-subtle)] border border-[var(--amber)]/20 text-xs">
          <span className="text-[var(--amber)] font-medium">📝 Draft restored</span>
          <button type="button" onClick={clearDraft} className="text-muted-foreground hover:text-foreground">
            Clear draft
          </button>
        </div>
      )}

      {submitError && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20
                                      text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* ── SECTION 1: Basic Info ──────────────────────────────────────── */}
      <FormSection title="Basic Information">
        <FormField label="Title" required error={errors.title?.message}>
          <input
            {...register("title")}
            placeholder="e.g. CS201 Data Structures Past Exam 2023"
            className={inputClass(!!errors.title)}
          />
        </FormField>

        <FormField label="Description" error={errors.description?.message}>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Briefly describe the content, course, and what students will find useful…"
            className={cn(inputClass(), "resize-none")}
          />
        </FormField>
      </FormSection>

      {/* ── SECTION 2: Classification ─────────────────────────────────── */}
      <FormSection title="Classification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Resource Type" required error={errors.resourceType?.message}>
            <select {...register("resourceType")} className={inputClass(!!errors.resourceType)}>
              <option value="">Select type…</option>
              {RESOURCE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Category" required error={errors.categoryId?.message}>
            <select {...register("categoryId")} className={inputClass(!!errors.categoryId)}>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Academic Year" error={errors.academicYear?.message}>
            <select {...register("academicYear")} className={inputClass()}>
              <option value="">Select year…</option>
              {Array.from({ length: 35 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Semester" error={errors.semester?.message}>
            <select {...register("semester")} className={inputClass()}>
              <option value="">Select semester…</option>
              <option value="semester_1">Semester 1</option>
              <option value="semester_2">Semester 2</option>
              <option value="semester_3">Semester 3</option>
              <option value="annual">Annual / Full Year</option>
              <option value="other">Other</option>
            </select>
          </FormField>
        </div>
      </FormSection>

      {/* ── SECTION 3: Institution & Language ─────────────────────────── */}
      <FormSection title="Institution & Language">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Institution" required error={errors.institutionId?.message}>
            <select {...register("institutionId")} className={inputClass(!!errors.institutionId)}>
              <option value="">Select institution…</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Language" error={errors.language?.message}>
            <select {...register("language")} className={inputClass()}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </FormField>
        </div>
      </FormSection>

      {/* ── SECTION 4: Tags ───────────────────────────────────────────── */}
      <FormSection title="Tags">
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput
              value={field.value || []}
              onChange={field.onChange}
              maxTags={10}
              placeholder="Type to search or create tags…"
              error={errors.tags?.message}
            />
          )}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Add up to 10 tags to make your document easier to find.
        </p>
      </FormSection>

      {/* ── SECTION 5: Access & License ──────────────────────────────── */}
      <FormSection title="Access & License">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Visibility" error={errors.visibility?.message}>
            <select {...register("visibility")} className={inputClass()}>
              <option value="public">Public - Anyone can find it</option>

            </select>
          </FormField>

          <FormField label="License" error={errors.license?.message}>
            <select {...register("license")} className={inputClass()}>
              {LICENSES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Toggles */}
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          {[
            { field: "allowDownload" as const, label: "Allow Downloads",          desc: "Others can download this document" },
            { field: "allowPrint"    as const, label: "Allow Printing",            desc: "Others can print this document"   },
          ].map(({ field, label, desc }) => (
            <label key={field} className="flex items-center gap-3 p-3 rounded-xl border border-border
                                          bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors flex-1">
              <input
                type="checkbox"
                {...register(field)}
                className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Your document will be reviewed before going live. Usually within 24 hours.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shrink-0",
            "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
            "transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Submitting…
            </>
          ) : (
            <>
              Submit for Review
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 p-5 bg-secondary/30 rounded-2xl border border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function FormField({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function inputClass(hasError?: boolean) {
  return cn(
    "w-full h-11 px-3.5 rounded-xl bg-secondary border text-sm text-foreground",
    "placeholder:text-muted-foreground outline-none transition-all duration-150",
    "hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20",
    hasError ? "border-destructive focus:ring-destructive/20" : "border-border"
  );
}
