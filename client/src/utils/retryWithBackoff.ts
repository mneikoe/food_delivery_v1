/**
 * Retry an API request with exponential backoff
 * Useful for handling rate limits and temporary failures
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx server errors
    // DON'T retry on 429 (rate limit) - respect the limit
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 && status < 600; // Server errors only
  },
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Don't retry if shouldRetry returns false
      if (!opts.shouldRetry(error)) {
        break;
      }

      // Wait before retrying
      console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff with max delay cap
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Example usage:
 * 
 * const data = await retryWithBackoff(
 *   () => api.get('/user/profile'),
 *   { maxRetries: 3 }
 * );
 */
