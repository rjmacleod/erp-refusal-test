import { TestCase, EvaluationResult, BatchResult, ModelProvider, ProviderConfig } from '../types';
import { ProviderFactory } from '../providers';
import { HybridDetector } from '../detection';
import { StorageManager } from '../storage';
import { FileLogger } from '../utils/fileLogger';

export class Evaluator {
  private providers: Map<ModelProvider, any> = new Map();
  private detector: HybridDetector;
  private storage: StorageManager;
  private logger: FileLogger;

  constructor(
    providerConfigs: Record<ModelProvider, ProviderConfig>,
    llmApiKey?: string,
    storageOptions?: any
  ) {
    this.logger = new FileLogger();
    
    // Initialize providers with logger
    for (const [provider, config] of Object.entries(providerConfigs) as [ModelProvider, ProviderConfig][]) {
      try {
        this.providers.set(provider, ProviderFactory.createProvider(provider, config, this.logger));
      } catch (error) {
        console.warn(`Failed to initialize ${provider} provider:`, error);
      }
    }

    this.detector = new HybridDetector(llmApiKey);
    this.storage = new StorageManager(storageOptions);
  }

  async evaluateTestCase(testCase: TestCase): Promise<EvaluationResult> {
    console.log(`Evaluating test case ${testCase.id} with ${testCase.model} provider...`);

    try {
      // Get the appropriate provider
      const provider = this.providers.get(testCase.model);
      if (!provider) {
        throw new Error(`Provider not available for model: ${testCase.model}`);
      }

      // Generate model response
      const modelResponse = await provider.generateResponse(testCase);
      console.log(`Generated response: ${modelResponse.response.substring(0, 100)}...`);

      // Analyze for refusal
      const refusalAnalysis = await this.detector.analyzeRefusal(testCase.id, modelResponse.response);
      console.log(`Refusal analysis: ${refusalAnalysis.isRefusal ? 'REFUSED' : 'ACCEPTED'} (confidence: ${refusalAnalysis.confidence.toFixed(2)})`);

      // Log additional response details with refusal analysis
      await this.logger.logResponse(
        testCase.model,
        testCase.id,
        modelResponse.response,
        modelResponse.responseTime,
        modelResponse.tokens,
        { refused: refusalAnalysis.isRefusal, confidence: refusalAnalysis.confidence }
      );

      const result: EvaluationResult = {
        testCase,
        response: modelResponse,
        analysis: refusalAnalysis
      };

      // Store the result
      await this.storage.saveEvaluationResult(result);

      return result;
    } catch (error: any) {
      console.error(`Error evaluating test case ${testCase.id}:`, error);
      throw error;
    }
  }

  async evaluateBatch(testCases: TestCase[]): Promise<BatchResult> {
    const batchResult: BatchResult = {
      total: testCases.length,
      completed: 0,
      failed: 0,
      results: [],
      startTime: new Date()
    };

    console.log(`Starting batch evaluation of ${testCases.length} test cases...`);

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      try {
        console.log(`\nProcessing test case ${i + 1}/${testCases.length}...`);
        const result = await this.evaluateTestCase(testCase);
        batchResult.results.push(result);
        batchResult.completed++;
      } catch (error) {
        console.error(`Failed to evaluate test case ${testCase.id}:`, error);
        batchResult.failed++;
      }

      // Progress update
      const progress = ((i + 1) / testCases.length * 100).toFixed(1);
      console.log(`Progress: ${progress}% (${batchResult.completed} completed, ${batchResult.failed} failed)`);

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    batchResult.endTime = new Date();
    
    // Save batch results
    const batchId = `batch_${Date.now()}`;
    await this.storage.saveBatchResults(batchResult.results, batchId);

    // Log session summary
    const duration = batchResult.endTime.getTime() - batchResult.startTime.getTime();
    await this.logger.logSessionSummary(
      batchResult.total,
      batchResult.completed,
      batchResult.failed,
      duration
    );

    console.log(`\nBatch evaluation completed!`);
    console.log(`Total: ${batchResult.total}, Completed: ${batchResult.completed}, Failed: ${batchResult.failed}`);
    console.log(`Duration: ${duration / 1000}s`);
    console.log(`Logs saved to: ${this.logger.getLogDirectory()}`);

    return batchResult;
  }

  async getResults(): Promise<EvaluationResult[]> {
    return this.storage.getEvaluationResults();
  }

  async getResultsByProvider(provider: ModelProvider): Promise<EvaluationResult[]> {
    return this.storage.getResultsByProvider(provider);
  }

  generateSummaryStats(results: EvaluationResult[]): {
    totalTests: number;
    refusalRate: number;
    avgConfidence: number;
    byProvider: Record<string, { total: number; refusals: number; rate: number }>;
    byIntensity: Record<number, { total: number; refusals: number; rate: number }>;
  } {
    const stats = {
      totalTests: results.length,
      refusalRate: 0,
      avgConfidence: 0,
      byProvider: {} as Record<string, { total: number; refusals: number; rate: number }>,
      byIntensity: {} as Record<number, { total: number; refusals: number; rate: number }>
    };

    if (results.length === 0) return stats;

    let totalRefusals = 0;
    let totalConfidence = 0;

    for (const result of results) {
      // Overall stats
      if (result.analysis.isRefusal) totalRefusals++;
      totalConfidence += result.analysis.confidence;

      // By provider
      const provider = result.response.provider;
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = { total: 0, refusals: 0, rate: 0 };
      }
      stats.byProvider[provider].total++;
      if (result.analysis.isRefusal) {
        stats.byProvider[provider].refusals++;
      }

      // By intensity
      const intensity = result.testCase.intensityLevel;
      if (!stats.byIntensity[intensity]) {
        stats.byIntensity[intensity] = { total: 0, refusals: 0, rate: 0 };
      }
      stats.byIntensity[intensity].total++;
      if (result.analysis.isRefusal) {
        stats.byIntensity[intensity].refusals++;
      }
    }

    stats.refusalRate = (totalRefusals / results.length) * 100;
    stats.avgConfidence = totalConfidence / results.length;

    // Calculate rates
    for (const provider in stats.byProvider) {
      const providerStats = stats.byProvider[provider];
      providerStats.rate = (providerStats.refusals / providerStats.total) * 100;
    }

    for (const intensity in stats.byIntensity) {
      const intensityStats = stats.byIntensity[intensity];
      intensityStats.rate = (intensityStats.refusals / intensityStats.total) * 100;
    }

    return stats;
  }

  close(): void {
    this.storage.close();
  }
}