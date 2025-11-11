import { useState } from "react";
import type {
  RegisterFormData,
  RegisterFormFieldError,
  RegisterRequest,
  RegisterSuccessResponse,
  RegisterError,
} from "../types";

/**
 * useRegisterForm Hook
 *
 * Encapsulates all registration form logic, validation, and API integration.
 * Manages form state, validation errors, submission state, and field touch tracking.
 *
 * @returns Form state and event handlers for the registration form
 */
export const useRegisterForm = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<RegisterFormFieldError>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /**
   * Validates email field
   * @returns Error message or undefined if valid
   */
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return "Email is required";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  /**
   * Validates password field
   * @returns Error message or undefined if valid
   */
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    return undefined;
  };

  /**
   * Validates confirm password field
   * @returns Error message or undefined if valid
   */
  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) {
      return "Please confirm your password";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return undefined;
  };

  /**
   * Handles input changes for form fields
   */
  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Handles blur events for validation timing
   */
  const handleBlur = (field: keyof RegisterFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate field on blur
    let error: string | undefined;
    if (field === "email") {
      error = validateEmail(formData.email);
    } else if (field === "password") {
      error = validatePassword(formData.password);
    } else if (field === "confirmPassword") {
      error = validateConfirmPassword(formData.password, formData.confirmPassword);
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);

    if (emailError || passwordError || confirmError) {
      setErrors({
        email: emailError,
        password: passwordError,
        confirmPassword: confirmError,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        } as RegisterRequest),
      });

      if (!response.ok) {
        const error: RegisterError = await response.json();

        if (error.error.field) {
          setErrors({ [error.error.field]: error.error.message });
        } else {
          // For non-field-specific errors, we'll handle this with a toast later
          // For now, set a generic error
          setErrors({ email: error.error.message });
        }

        return;
      }

      const data: RegisterSuccessResponse = await response.json();

      // Store session in localStorage
      localStorage.setItem("session", JSON.stringify(data.session));

      // Redirect to decks page after successful registration
      window.location.href = "/decks";
    } catch (error) {
      // Network or unexpected errors
      setErrors({ email: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
  };
};
