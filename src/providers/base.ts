import { ModelResponse, TestCase, ProviderConfig } from '../types';
import { FileLogger } from '../utils/fileLogger';

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected logger: FileLogger;
  protected lastRequestTime: number = 0;
  protected requestCount: number = 0;
  protected requestWindow: number = 60000; // 1 minute

  constructor(config: ProviderConfig, logger?: FileLogger) {
    this.config = config;
    this.logger = logger || new FileLogger();
  }

  abstract generateResponse(testCase: TestCase): Promise<ModelResponse>;
  abstract getAvailableModels(): string[];
  abstract calculateCost(tokens: number): number;

  protected async rateLimitWait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastWindow = now - this.lastRequestTime;

    if (timeSinceLastWindow >= this.requestWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    if (this.requestCount >= this.config.rateLimitPerMinute) {
      const waitTime = this.requestWindow - timeSinceLastWindow;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }

    this.requestCount++;
  }

  protected formatPrompt(testCase: TestCase): string {
    // The prompt is already formatted by ConfigLoader with the template
    return testCase.prompt;
  }
}