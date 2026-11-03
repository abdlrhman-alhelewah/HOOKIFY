export interface RetryState {
  attempt: number;
  maxRetries: number;
  delayMs: number;
  error: any;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (state: RetryState) => void;
}

/**
 * Custom fetch wrapper that implements exponential backoff retry strategy.
 * Specifically targets rate limit (429) errors and temporary network/server glitches (>= 500).
 */
export async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const maxRetries = retryOptions?.maxRetries ?? 3;
  const baseDelayMs = retryOptions?.baseDelayMs ?? 1500;

  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, options);

      // Check if we need to retry on 429 (Rate-limiting) or 5xx (Transient server issues)
      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        if (attempt < maxRetries) {
          attempt++;
          // Exponential Backoff calculation: baseDelay * 2^(attempt - 1)
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          
          if (retryOptions?.onRetry) {
            retryOptions.onRetry({
              attempt,
              maxRetries,
              delayMs,
              error: new Error(`HTTP ${response.status} ${response.statusText}`),
            });
          }
          
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }

      return response;
    } catch (error: any) {
      // Catch network-level errors or CORS/connection interruptions
      if (attempt < maxRetries) {
        attempt++;
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        
        if (retryOptions?.onRetry) {
          retryOptions.onRetry({
            attempt,
            maxRetries,
            delayMs,
            error,
          });
        }
        
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
}
