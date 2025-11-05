import { z } from 'zod';
import type { APIContext } from 'astro';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

/**
 * Validates request body against Zod schema
 * Returns structured validation result
 */
export async function validateRequest<T>(
  context: APIContext,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await context.request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });

      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      errors: {
        _form: 'Invalid request body',
      },
    };
  }
}

/**
 * Creates validation error response
 */
export function createValidationErrorResponse(
  errors: Record<string, string>
): Response {
  return new Response(JSON.stringify({
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: errors,
    },
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
