import React, { useMemo } from "react";
import { Check, X } from "lucide-react";
import type { PasswordRequirement } from "@/types";

interface PasswordRequirementsProps {
  password: string;
  showChecklist?: boolean;
}

/**
 * PasswordRequirements Component
 *
 * Displays a visual checklist of password requirements with real-time feedback.
 * Shows which requirements are met or unmet as the user types their password.
 *
 * @param password - Current password value to validate
 * @param showChecklist - Optional flag to hide checklist until user focuses password field
 */
export function PasswordRequirements({
  password,
  showChecklist = true
}: PasswordRequirementsProps) {
  const requirements: PasswordRequirement[] = useMemo(() => {
    return [
      {
        id: "minLength",
        label: "At least 8 characters",
        test: (pwd: string) => pwd.length >= 8,
        met: password.length >= 8,
      },
    ];
  }, [password]);

  if (!showChecklist) {
    return null;
  }

  return (
    <div
      className="mt-2 space-y-1"
      role="status"
      aria-live="polite"
      aria-label="Password requirements"
    >
      <p className="text-sm text-muted-foreground">Password must contain:</p>
      <ul className="space-y-1">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={`flex items-center gap-2 text-sm ${
              requirement.met
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground"
            }`}
          >
            {requirement.met ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <X className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{requirement.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
