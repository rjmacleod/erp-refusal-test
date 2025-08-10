export interface TestCase {
  id: string;
  prompt: string;
  character: string;
  model: ModelProvider;
  modelName: string;
  intensityLevel: number;
  category: string;
  createdAt: Date;
}

export interface ModelResponse {
  testCaseId: string;
  provider: ModelProvider;
  model: string;
  response: string;
  responseTime: number;
  tokens: number;
  cost: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface RefusalAnalysis {
  testCaseId: string;
  isRefusal: boolean;
  confidence: number;
  reason: string;
  detectionMethod: 'keyword' | 'llm' | 'hybrid';
  keywords?: string[];
  timestamp: Date;
}

export interface EvaluationResult {
  testCase: TestCase;
  response: ModelResponse;
  analysis: RefusalAnalysis;
}

export type ModelProvider = 'anthropic' | 'openai' | 'xai';

export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  rateLimitPerMinute: number;
}

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface BatchResult {
  total: number;
  completed: number;
  failed: number;
  results: EvaluationResult[];
  startTime: Date;
  endTime?: Date;
}