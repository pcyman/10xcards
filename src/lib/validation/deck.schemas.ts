import { z } from "zod";

/**
 * Validation schema for UpdateDeckCommand
 * Validates the request body for PATCH /api/decks/:id
 */
export const updateDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less")
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be whitespace only",
    }),
});

/**
 * UUID validation schema
 * Used for validating deck IDs in path parameters
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");
