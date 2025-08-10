export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { requests: number; window: number }> = new Map();

  constructor() {
    // Default rate limits (requests per minute)
    this.setLimit('anthropic', 60, 60000); // 60 requests per minute
    this.setLimit('openai', 60, 60000); // 60 requests per minute  
    this.setLimit('xai', 30, 60000); // 30 requests per minute (more conservative)
  }

  setLimit(provider: string, requests: number, windowMs: number): void {
    this.limits.set(provider, { requests, window: windowMs });
  }

  async checkAndWait(provider: string): Promise<void> {
    const limit = this.limits.get(provider);
    if (!limit) return;

    const now = Date.now();
    const providerRequests = this.requests.get(provider) || [];
    
    // Remove old requests outside the window
    const validRequests = providerRequests.filter(time => now - time < limit.window);
    
    // Check if we're at the limit
    if (validRequests.length >= limit.requests) {
      const oldestRequest = Math.min(...validRequests);
      const waitTime = limit.window - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached for ${provider}. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Update request history
    validRequests.push(now);
    this.requests.set(provider, validRequests);
  }

  getRequestCount(provider: string): number {
    const limit = this.limits.get(provider);
    if (!limit) return 0;

    const now = Date.now();
    const providerRequests = this.requests.get(provider) || [];
    return providerRequests.filter(time => now - time < limit.window).length;
  }

  getRemainingRequests(provider: string): number {
    const limit = this.limits.get(provider);
    if (!limit) return Infinity;

    return Math.max(0, limit.requests - this.getRequestCount(provider));
  }
}