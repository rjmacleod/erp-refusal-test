import dotenv from 'dotenv';
import { Evaluator } from './pipeline/evaluator';
import { TestCaseManager } from './utils/testCases';
import { CSVExporter } from './utils/csvExporter';
import { ModelProvider, ProviderConfig, TestCase } from './types';
import { ErrorHandler } from './utils/errorHandler';

// Load environment variables
dotenv.config();

class ERPRefusalEvaluationSystem {
  private evaluator: Evaluator;
  private testCaseManager: TestCaseManager;

  constructor() {
    // Configure providers
    const providerConfigs: Record<ModelProvider, ProviderConfig> = {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        rateLimitPerMinute: 60
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        rateLimitPerMinute: 60
      },
      xai: {
        apiKey: process.env.XAI_API_KEY || '',
        rateLimitPerMinute: 30
      }
    };

    // Initialize evaluator with LLM detection using OpenAI
    this.evaluator = new Evaluator(
      providerConfigs,
      process.env.OPENAI_API_KEY, // Use OpenAI for LLM-based refusal detection
      {
        useDatabase: true,
        useJSON: true,
        dataDir: './data'
      }
    );

    this.testCaseManager = new TestCaseManager();
  }

  async runSampleEvaluation(): Promise<void> {
    console.log('🚀 Starting ERP Refusal Evaluation System');
    console.log('================================================');

    try {
      // Create sample test cases
      const testCases = await this.createSampleTestCases();
      console.log(`Created ${testCases.length} sample test cases`);

      // Run evaluation
      const batchResult = await this.evaluator.evaluateBatch(testCases);
      console.log('\n📊 Batch Evaluation Results:');
      console.log(`Total: ${batchResult.total}`);
      console.log(`Completed: ${batchResult.completed}`);
      console.log(`Failed: ${batchResult.failed}`);

      // Generate summary statistics
      const stats = this.evaluator.generateSummaryStats(batchResult.results);
      this.printSummaryStats(stats);

      // Export results
      await this.exportResults(batchResult.results);

    } catch (error) {
      ErrorHandler.logError(error as Error, 'Main evaluation');
      process.exit(1);
    }
  }

  private async createSampleTestCases(): Promise<TestCase[]> {
    // Test intensity levels 4-5 (focus on suggestive to explicit content)
    // Use specific templates for more controlled testing
    return await this.testCaseManager.createBatchFromConfig(
      { min: 4, max: 5 }, // Intensity range
      ['anthropic', 'openai', 'xai'], // All providers
      ['erp_contract_v2', 'erp_dual_channel_v2'], // Updated template IDs
      'config_evaluation'
    );
  }

  private printSummaryStats(stats: any): void {
    console.log('\n📈 Summary Statistics:');
    console.log('=====================');
    console.log(`Total Tests: ${stats.totalTests}`);
    console.log(`Overall Refusal Rate: ${stats.refusalRate.toFixed(2)}%`);
    console.log(`Average Confidence: ${stats.avgConfidence.toFixed(3)}`);

    console.log('\n📊 By Provider:');
    for (const [provider, providerStats] of Object.entries(stats.byProvider) as [string, any][]) {
      console.log(`  ${provider}: ${providerStats.refusals}/${providerStats.total} (${providerStats.rate.toFixed(2)}%)`);
    }

    console.log('\n🌡️ By Intensity Level:');
    for (const [intensity, intensityStats] of Object.entries(stats.byIntensity) as [string, any][]) {
      console.log(`  Level ${intensity}: ${intensityStats.refusals}/${intensityStats.total} (${intensityStats.rate.toFixed(2)}%)`);
    }
  }

  private async exportResults(results: any[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
      // Export detailed results
      await CSVExporter.exportResults(results, `./exports/detailed_results_${timestamp}.csv`);
      
      // Export summary statistics
      const stats = this.evaluator.generateSummaryStats(results);
      await CSVExporter.exportSummaryStats(stats, `./exports/summary_stats_${timestamp}.csv`);
      
      // Export provider comparison
      await CSVExporter.exportProviderComparison(results, `./exports/provider_comparison_${timestamp}.csv`);

      console.log(`\n💾 Results exported to ./exports/ directory`);
    } catch (error) {
      console.error('Error exporting results:', error);
    }
  }

  async cleanup(): Promise<void> {
    this.evaluator.close();
  }
}

// Main execution
async function main() {
  const system = new ERPRefusalEvaluationSystem();
  
  try {
    await system.runSampleEvaluation();
  } catch (error) {
    ErrorHandler.logError(error as Error, 'System execution');
  } finally {
    await system.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Only run if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ERPRefusalEvaluationSystem };