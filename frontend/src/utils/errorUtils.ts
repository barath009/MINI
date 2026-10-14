/**
 * Helper utility to extract clean, human-readable error messages from Axios / API errors.
 */
export function formatErrorMessage(err: any, fallbackMessage: string = 'An error occurred'): string {
  if (!err) return fallbackMessage;

  let rawMessage = err.response?.data?.message || err.message || fallbackMessage;

  if (typeof rawMessage === 'string') {
    const trimmed = rawMessage.trim();
    // If the message is a stringified JSON array (e.g. Zod error output)
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => item.message || `${item.path?.join('.') || 'Field'} is invalid`).join(' | ');
        }
      } catch (e) {
        // Return raw message if parse fails
      }
    }
    return rawMessage;
  }

  if (Array.isArray(rawMessage)) {
    return rawMessage
      .map((item: any) => (typeof item === 'string' ? item : item.message || JSON.stringify(item)))
      .join(' | ');
  }

  return fallbackMessage;
}
