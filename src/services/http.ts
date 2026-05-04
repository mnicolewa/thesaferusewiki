const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Runs a JSON fetch with an AbortController timeout and plain-language error mapping.
 */
export async function fetchJsonWithTimeout<T>(
  input: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: init?.cache ?? "no-store",
    });

    if (!response.ok) {
      throw new Error(`Upstream service error (${response.status})`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The request took too long to complete.");
    }
    throw error instanceof Error ? error : new Error("Unable to reach the service.");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Converts low-level errors into plain-language messages safe to show in the UI.
 */
export function toPlainLanguageError(
  error: unknown,
  fallback = "We could not load that information right now."
) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.includes("too long")) {
    return "The service is taking too long right now. Please try again.";
  }

  return fallback;
}

/**
 * Performs a lightweight availability check for a public upstream endpoint.
 */
export async function pingUrl(url: string): Promise<boolean> {
  try {
    await fetchJsonWithTimeout(url, undefined, 10_000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes text keys for client-side session caches.
 */
export function normalizeCacheKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
