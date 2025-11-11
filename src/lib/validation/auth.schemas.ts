import { z } from "zod";

// Email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email is too long");

// Password validation
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long");

// Registration schema
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
