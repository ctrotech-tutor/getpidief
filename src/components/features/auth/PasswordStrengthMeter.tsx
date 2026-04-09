"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

interface StrengthResult {
  level: StrengthLevel;
  label: string;
  color: string;
  textColor: string;
  checks: { label: string; passed: boolean }[];
}

function getStrength(password: string): StrengthResult {
  const checks = [
    { label: "8+ characters",        passed: password.length >= 8                   },
    { label: "Uppercase letter",      passed: /[A-Z]/.test(password)                 },
    { label: "Number",                passed: /[0-9]/.test(password)                 },
    { label: "Special character",     passed: /[^A-Za-z0-9]/.test(password)          },
    { label: "12+ characters",        passed: password.length >= 12                  },
  ];

  const passed = checks.filter((c) => c.passed).length;
  let level: StrengthLevel = 0;
  if (passed === 0) level = 0;
  else if (passed <= 2) level = 1;
  else if (passed === 3) level = 2;
  else if (passed === 4) level = 3;
  else level = 4;

  const map: Record<StrengthLevel, { label: string; color: string; textColor: string }> = {
    0: { label: "",        color: "bg-border",                  textColor: "text-muted-foreground" },
    1: { label: "Weak",    color: "bg-destructive",             textColor: "text-destructive"      },
    2: { label: "Fair",    color: "bg-[var(--amber)]",          textColor: "text-[var(--amber)]"   },
    3: { label: "Strong",  color: "bg-[var(--emerald)]",        textColor: "text-[var(--emerald)]" },
    4: { label: "Fortress","color": "bg-[var(--emerald)]",      textColor: "text-[var(--emerald)]" },
  };

  return { level, checks: checks.slice(0, 4), ...map[level] };
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className={cn("space-y-2 mt-2", className)} role="status" aria-live="polite">
      {/* Segmented bar */}
      <div className="flex gap-1.5" aria-label={`Password strength: ${strength.label}`}>
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              seg <= strength.level ? strength.color : "bg-border"
            )}
          />
        ))}
      </div>

      {/* Label + checks row */}
      <div className="flex items-center justify-between">
        {strength.label && (
          <span className={cn("text-xs font-medium", strength.textColor)}>
            {strength.label}
          </span>
        )}
        <div className="flex gap-3 ml-auto">
          {strength.checks.map((check) => (
            <span
              key={check.label}
              className={cn(
                "text-xs transition-colors duration-200",
                check.passed ? "text-[var(--emerald)]" : "text-muted-foreground"
              )}
            >
              {check.passed ? "✓ " : "· "}
              {check.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
