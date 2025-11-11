import { z } from "zod";

// Error codes enum
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Authentication errors (401)
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_REFRESH_TOKEN = "INVALID_REFRESH_TOKEN",

  // Authorization errors (403)
  FORBIDDEN = "FORBIDDEN",

  // Resource errors (404)
  NOT_FOUND = "NOT_FOUND",

  // Conflict errors (409)
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Server errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",

  // Service errors (503)
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

interface ErrorResponse {
  error: {
    message: string;
    code: string;
    field?: string;
    fields?: Record<string, string>;
    trackingId?: string;
  };
}

interface ErrorHandlerOptions {
  logError?: boolean;
  exposeDetails?: boolean;
}

class ApplicationError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

/**
 * Creates error response with standard structure
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number,
  additionalData?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: {
        message,
        code,
        ...additionalData,
      },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Handles validation errors from Zod
 */
function handleValidationError(error: z.ZodError): Response {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });

  return createErrorResponse("Validation failed", ErrorCode.VALIDATION_ERROR, 400, { fields: errors });
}

/**
 * Checks if error is a Supabase error
 */
function isSupabaseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && "message" in error;
}

/**
 * Handles Supabase-specific errors
 */
function handleSupabaseError(error: unknown, exposeDetails: boolean): Response {
  if (!isSupabaseError(error)) {
    return createErrorResponse("An unexpected error occurred. Please try again.", ErrorCode.INTERNAL_ERROR, 500);
  }

  const supabaseError = error as { message: string; status: number };

  // Map Supabase errors to our error codes
  const errorMappings: Record<string, { message: string; code: string; status: number }> = {
    "User already registered": {
      message: "Email already registered. Please login instead.",
      code: ErrorCode.EMAIL_ALREADY_EXISTS,
      status: 409,
    },
    "Invalid login credentials": {
      message: "Invalid email or password",
      code: ErrorCode.INVALID_CREDENTIALS,
      status: 401,
    },
    "Email rate limit exceeded": {
      message: "Too many requests. Please try again later.",
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      status: 429,
    },
    "Password should be at least 8 characters": {
      message: "Password must be at least 8 characters",
      code: ErrorCode.VALIDATION_ERROR,
      status: 400,
    },
    "Refresh token not found": {
      message: "Invalid refresh token",
      code: ErrorCode.INVALID_REFRESH_TOKEN,
      status: 401,
    },
    "JWT expired": {
      message: "Your session has expired. Please log in again.",
      code: ErrorCode.SESSION_EXPIRED,
      status: 401,
    },
  };

  const mapping = errorMappings[supabaseError.message];

  if (mapping) {
    return createErrorResponse(mapping.message, mapping.code, mapping.status);
  }

  // Generic error for unknown Supabase errors
  const message = exposeDetails ? supabaseError.message : "An unexpected error occurred. Please try again.";

  return createErrorResponse(message, ErrorCode.INTERNAL_ERROR, 500);
}

/**
 * Handles errors and returns appropriate Response
 */
export function handleError(
  error: unknown,
  context: string,
  options: ErrorHandlerOptions = { logError: true, exposeDetails: false }
): Response {
  // Log error for debugging
  if (options.logError) {
    console.error(`[${context}]`, error);
  }

  // Handle Supabase errors
  if (isSupabaseError(error)) {
    return handleSupabaseError(error, options.exposeDetails ?? false);
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return handleValidationError(error);
  }

  // Handle known application errors
  if (error instanceof ApplicationError) {
    return createErrorResponse(error.message, error.code, error.statusCode);
  }

  // Generic server error
  return createErrorResponse("An unexpected error occurred. Please try again.", ErrorCode.INTERNAL_ERROR, 500);
}

export { ApplicationError };
