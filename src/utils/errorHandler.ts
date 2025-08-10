export class APIError extends Error {
  public provider: string;
  public statusCode?: number;
  public retryAfter?: number;

  constructor(message: string, provider: string, statusCode?: number, retryAfter?: number) {
    super(message);
    this.name = 'APIError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export class RateLimitError extends APIError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 429, retryAfter);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends APIError {
  constructor(provider: string) {
    super(`Authentication failed for ${provider}`, provider, 401);
    this.name = 'AuthenticationError';
  }
}

export class QuotaExceededError extends APIError {
  constructor(provider: string) {
    super(`Quota exceeded for ${provider}`, provider, 402);
    this.name = 'QuotaExceededError';
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(provider: string) {
    super(`Service unavailable for ${provider}`, provider, 503);
    this.name = 'ServiceUnavailableError';
  }
}

export class ErrorHandler {
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (attempt === maxRetries) {
          throw error;
        }

        // Don't retry certain errors
        if (error instanceof AuthenticationError || error instanceof QuotaExceededError) {
          throw error;
        }

        // Calculate delay with exponential backoff
        let delay = baseDelay * Math.pow(2, attempt);

        // Use retry-after header if available
        if (error instanceof RateLimitError && error.retryAfter) {
          delay = error.retryAfter * 1000;
        }

        // Add jitter
        delay += Math.random() * 1000;

        console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        console.log(`Error: ${error.message}`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  static handleAxiosError(error: any, provider: string): APIError {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      const retryAfter = error.response.headers['retry-after'];

      switch (status) {
        case 401:
          return new AuthenticationError(provider);
        case 402:
          return new QuotaExceededError(provider);
        case 429:
          return new RateLimitError(provider, retryAfter ? parseInt(retryAfter) : undefined);
        case 503:
          return new ServiceUnavailableError(provider);
        default:
          return new APIError(`HTTP ${status}: ${message}`, provider, status);
      }
    } else if (error.request) {
      return new APIError(`Network error: ${error.message}`, provider);
    } else {
      return new APIError(`Request error: ${error.message}`, provider);
    }
  }

  static logError(error: Error, context?: string): void {
    const timestamp = new Date().toISOString();
    const logContext = context ? ` [${context}]` : '';
    
    console.error(`${timestamp}${logContext} ${error.name}: ${error.message}`);
    
    if (error.stack) {
      console.error(error.stack);
    }

    if (error instanceof APIError) {
      console.error(`Provider: ${error.provider}`);
      if (error.statusCode) console.error(`Status Code: ${error.statusCode}`);
      if (error.retryAfter) console.error(`Retry After: ${error.retryAfter}s`);
    }
  }

  static isRetryableError(error: Error): boolean {
    if (error instanceof AuthenticationError || error instanceof QuotaExceededError) {
      return false;
    }

    if (error instanceof APIError) {
      return error.statusCode === 429 || error.statusCode === 503 || error.statusCode === 500;
    }

    // Network errors are retryable
    return error.message.includes('timeout') || 
           error.message.includes('ECONNRESET') ||
           error.message.includes('ENOTFOUND');
  }
}