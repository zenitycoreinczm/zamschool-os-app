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
  return fallback;
}