import { useState, useCallback, type FormEvent } from "react";

interface UseDeckFormReturn {
  name: string;
  errors: { name?: string };
  isValid: boolean;
  isSubmitting: boolean;
  setName: (name: string) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for deck form state and validation
 * Handles validation rules:
 * - Name required (trimmed length >= 1)
 * - Name max length (255 characters)
 * - No whitespace-only names
 */
export function useDeckForm(initialName: string, onSubmit: (name: string) => Promise<void>): UseDeckFormReturn {
  const [name, setNameState] = useState(initialName);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate the deck name
   * Returns error message or undefined if valid
   */
  const validateName = useCallback((value: string): string | undefined => {
    if (value.length > 255) {
      return "Deck name must not exceed 255 characters";
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 && value.length > 0) {
      return "Deck name cannot be empty or whitespace-only";
    }

    if (trimmed.length === 0) {
      return "Deck name is required";
    }

    return undefined;
  }, []);

  /**
   * Check if form is valid
   */
  const isValid = validateName(name) === undefined;

  /**
   * Set name and clear errors
   */
  const setName = useCallback((value: string) => {
    setNameState(value);
    setErrors({});
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate before submission
      const error = validateName(name);
      if (error) {
        setErrors({ name: error });
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(name.trim());
        setNameState(initialName);
        setErrors({});
      } catch (error) {
        // Handle API errors (e.g., 409 conflict)
        if (error instanceof Error) {
          setErrors({ name: error.message });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, validateName, onSubmit, initialName]
  );

  /**
   * Reset form to initial state
   */
  const reset = useCallback(() => {
    setNameState(initialName);
    setErrors({});
    setIsSubmitting(false);
  }, [initialName]);

  return {
    name,
    errors,
    isValid,
    isSubmitting,
    setName,
    handleSubmit,
    reset,
  };
}
