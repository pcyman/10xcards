import React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginForm } from "@/hooks/useLoginForm";

export const LoginForm: React.FC = () => {
  const {
    formData,
    errors,
    isSubmitting,
    apiError,
    showPassword,
    handleEmailChange,
    handlePasswordChange,
    togglePasswordVisibility,
    handleSubmit,
  } = useLoginForm();

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Log in to 10xCards</h1>

      {apiError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
        >
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            disabled={isSubmitting}
            autoFocus
            autoComplete="email"
            className={errors.email ? "border-red-500" : ""}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-500 mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
              autoComplete="current-password"
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={togglePasswordVisibility}
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-sm text-red-500 mt-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      {/* Link to Registration */}
      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <a href="/register" className="text-blue-600 hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
};
