import React from "react";
import { AlertCircle } from "lucide-react";

interface FormErrorMessageProps {
  id: string;
  message?: string;
  fieldId: string;
}

/**
 * FormErrorMessage Component
 *
 * Displays inline validation error messages below form fields.
 * Implements proper ARIA attributes for accessibility.
 *
 * @param id - Unique identifier for the error message element
 * @param message - Error message to display (component hidden if undefined)
 * @param fieldId - ID of the associated form field (for aria-describedby)
 */
export function FormErrorMessage({ id, message, fieldId }: FormErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div id={id} className="mt-1 flex items-center gap-1.5 text-sm text-destructive" role="alert" aria-live="polite">
      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
