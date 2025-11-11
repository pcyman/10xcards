import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterForm } from "@/hooks/useRegisterForm";
import { FormErrorMessage } from "./FormErrorMessage";
import { PasswordRequirements } from "./PasswordRequirements";

/**
 * RegisterForm Component
 *
 * The primary form component that orchestrates the entire registration flow.
 * Manages form state, handles user input, validates data in real-time,
 * submits registration requests to the API, and manages error/success states.
 */
export const RegisterForm: React.FC = () => {
  const { formData, errors, isSubmitting, touched, handleChange, handleBlur, handleSubmit } = useRegisterForm();

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Create your 10xCards account</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            disabled={isSubmitting}
            autoFocus
            autoComplete="email"
            className={errors.email ? "border-red-500" : ""}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          <FormErrorMessage id="email-error" message={errors.email} fieldId="email" />
        </div>

        {/* Password Field */}
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            disabled={isSubmitting}
            autoComplete="new-password"
            className={errors.password ? "border-red-500" : ""}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error password-requirements" : "password-requirements"}
          />
          <FormErrorMessage id="password-error" message={errors.password} fieldId="password" />
          <div id="password-requirements">
            <PasswordRequirements
              password={formData.password}
              showChecklist={touched.password || formData.password.length > 0}
            />
          </div>
        </div>

        {/* Confirm Password Field */}
        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            onBlur={() => handleBlur("confirmPassword")}
            disabled={isSubmitting}
            autoComplete="new-password"
            className={errors.confirmPassword ? "border-red-500" : ""}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          <FormErrorMessage id="confirmPassword-error" message={errors.confirmPassword} fieldId="confirmPassword" />
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Register"
          )}
        </Button>
      </form>

      {/* Link to Login */}
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
};
