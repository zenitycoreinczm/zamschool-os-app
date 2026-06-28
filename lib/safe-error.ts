/**
 * Safely extract a human-readable error message from any thrown value.
 *
 * @param err      - The caught error value (unknown).
 * @param fallback - A default message to return when the error has no useful message.
 * @returns A non-empty string describing the error.
 */
export function safeErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred",
): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  // Supabase/PostgREST errors are plain objects (not Error instances)
  // with { message, code, details, hint }.
  if (
    err &&
    typeof err === "object" &&
    typeof (err as { message?: unknown }).message === "string" &&
    (err as { message?: string }).message
  ) {
    return (err as { message: string }).message;
  }
  if (typeof err === "string" && err) {
    return err;
  }
  return fallback;
}
