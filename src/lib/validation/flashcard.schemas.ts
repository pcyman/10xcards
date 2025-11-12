import { z } from "zod";

/**
 * Validation schema for UpdateFlashcardCommand
 * Validates the request body for PATCH /api/flashcards/:id
 */
export const updateFlashcardSchema = z
  .object({
    front: z
      .string()
      .optional()
      .refine((val) => val === undefined || val.trim().length > 0, {
        message: "Front text cannot be empty or whitespace-only",
      }),
    back: z
      .string()
      .optional()
      .refine((val) => val === undefined || val.trim().length > 0, {
        message: "Back text cannot be empty or whitespace-only",
      }),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided",
  });
