import { useState } from "react";
import type { FormFieldError, LoginError, LoginFormData, LoginRequest, LoginSuccessResponse } from "../types";

export const useLoginForm = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormFieldError>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormFieldError = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
    setErrors((prev) => ({ ...prev, email: undefined }));
    setApiError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, password: e.target.value }));
    setErrors((prev) => ({ ...prev, password: undefined }));
    setApiError(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData as LoginRequest),
      });

      if (response.ok) {
        const data: LoginSuccessResponse = await response.json();

        // Store session in localStorage
        localStorage.setItem("session", JSON.stringify(data.session));

        window.location.href = "/decks";
        return;
      }

      const errorData: LoginError = await response.json();

      if (response.status === 401) {
        setApiError("Invalid username or password");
      } else if (response.status === 400 && errorData.error.field) {
        setErrors((prev) => ({
          ...prev,
          [errorData.error.field!]: errorData.error.message,
        }));
      } else {
        setApiError(errorData.error.message || "An error occurred. Please try again.");
      }
    } catch (error) {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    apiError,
    showPassword,
    handleEmailChange,
    handlePasswordChange,
    togglePasswordVisibility,
    handleSubmit,
  };
};
