import { ErrorCode } from '@/lib/errors/handler';

export function isSupabaseAuthError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

export function getAuthErrorMessage(error: unknown): string {
  if (!isSupabaseAuthError(error)) {
    return 'An unexpected error occurred';
  }

  const authError = error as { message: string; status: number };

  // Map Supabase errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'User already registered': 'Email already registered. Please login instead.',
    'Invalid login credentials': 'Invalid email or password',
    'Email rate limit exceeded': 'Too many requests. Please try again later.',
    'Password should be at least 8 characters': 'Password must be at least 8 characters',
    'Refresh token not found': 'Invalid refresh token',
    'JWT expired': 'Your session has expired. Please log in again.',
  };

  return errorMap[authError.message] ?? authError.message;
}

export function getAuthErrorCode(error: unknown): string {
  if (!isSupabaseAuthError(error)) {
    return ErrorCode.INTERNAL_ERROR;
  }

  const authError = error as { message: string };

  // Map to error codes
  const codeMap: Record<string, string> = {
    'User already registered': ErrorCode.EMAIL_ALREADY_EXISTS,
    'Invalid login credentials': ErrorCode.INVALID_CREDENTIALS,
    'Email rate limit exceeded': ErrorCode.RATE_LIMIT_EXCEEDED,
    'Refresh token not found': ErrorCode.INVALID_REFRESH_TOKEN,
    'JWT expired': ErrorCode.SESSION_EXPIRED,
  };

  return codeMap[authError.message] ?? 'AUTHENTICATION_ERROR';
}
