import * as csvWriter from 'csv-writer';
import { EvaluationResult } from '../types';

export class CSVExporter {
  static async exportResults(results: EvaluationResult[], filePath: string): Promise<void> {
    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'testCaseId', title: 'Test Case ID' },
        { id: 'category', title: 'Category' },
        { id: 'intensityLevel', title: 'Intensity Level' },
        { id: 'prompt', title: 'Prompt' },
        { id: 'character', title: 'Character' },
        { id: 'provider', title: 'Provider' },
        { id: 'model', title: 'Model' },
        { id: 'response', title: 'Response' },
        { id: 'responseTime', title: 'Response Time (ms)' },
        { id: 'tokens', title: 'Tokens' },
        { id: 'cost', title: 'Cost ($)' },
        { id: 'isRefusal', title: 'Is Refusal' },
        { id: 'confidence', title: 'Confidence' },
        { id: 'reason', title: 'Reason' },
        { id: 'detectionMethod', title: 'Detection Method' },
        { id: 'keywords', title: 'Keywords' },
        { id: 'timestamp', title: 'Timestamp' }
      ]
    });

    const records = results.map(result => ({
      testCaseId: result.testCase.id,
      category: result.testCase.category,
      intensityLevel: result.testCase.intensityLevel,
      prompt: result.testCase.prompt,
      character: result.testCase.character,
      provider: result.response.provider,
      model: result.response.model,
      response: result.response.response.replace(/\n/g, ' ').substring(0, 500), // Truncate for readability
      responseTime: result.response.responseTime,
      tokens: result.response.tokens,
      cost: result.response.cost.toFixed(4),
      isRefusal: result.analysis.isRefusal ? 'Yes' : 'No',
      confidence: result.analysis.confidence.toFixed(3),
      reason: result.analysis.reason,
      detectionMethod: result.analysis.detectionMethod,
      keywords: result.analysis.keywords?.join('; ') || '',
      timestamp: result.response.timestamp.toISOString()
    }));

    await writer.writeRecords(records);
    console.log(`Exported ${records.length} results to ${filePath}`);
  }

  static async exportSummaryStats(
    stats: any,
    filePath: string
  ): Promise<void> {
    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' }
      ]
    });

    const records = [
      { metric: 'Total Tests', value: stats.totalTests },
      { metric: 'Overall Refusal Rate (%)', value: stats.refusalRate.toFixed(2) },
      { metric: 'Average Confidence', value: stats.avgConfidence.toFixed(3) }
    ];

    // Add provider stats
    for (const [provider, providerStats] of Object.entries(stats.byProvider) as [string, any][]) {
      records.push(
        { metric: `${provider} - Total Tests`, value: providerStats.total },
        { metric: `${provider} - Refusals`, value: providerStats.refusals },
        { metric: `${provider} - Refusal Rate (%)`, value: providerStats.rate.toFixed(2) }
      );
    }

    // Add intensity stats
    for (const [intensity, intensityStats] of Object.entries(stats.byIntensity) as [string, any][]) {
      records.push(
        { metric: `Intensity ${intensity} - Total Tests`, value: intensityStats.total },
        { metric: `Intensity ${intensity} - Refusals`, value: intensityStats.refusals },
        { metric: `Intensity ${intensity} - Refusal Rate (%)`, value: intensityStats.rate.toFixed(2) }
      );
    }

    await writer.writeRecords(records);
    console.log(`Exported summary statistics to ${filePath}`);
  }

  static async exportProviderComparison(
    results: EvaluationResult[],
    filePath: string
  ): Promise<void> {
    // Group results by provider and test case
    const comparison: Record<string, any> = {};

    for (const result of results) {
      const key = `${result.testCase.prompt.substring(0, 50)}...`;
      if (!comparison[key]) {
        comparison[key] = {
          testCase: key,
          category: result.testCase.category,
          intensityLevel: result.testCase.intensityLevel
        };
      }
      
      const provider = result.response.provider;
      comparison[key][`${provider}_refusal`] = result.analysis.isRefusal ? 'Yes' : 'No';
      comparison[key][`${provider}_confidence`] = result.analysis.confidence.toFixed(3);
    }

    const headers = [
      { id: 'testCase', title: 'Test Case' },
      { id: 'category', title: 'Category' },
      { id: 'intensityLevel', title: 'Intensity Level' }
    ];

    // Add provider columns dynamically
    const providers = [...new Set(results.map(r => r.response.provider))];
    for (const provider of providers) {
      headers.push(
        { id: `${provider}_refusal`, title: `${provider} Refusal` },
        { id: `${provider}_confidence`, title: `${provider} Confidence` }
      );
    }

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    const records = Object.values(comparison);
    await writer.writeRecords(records);
    console.log(`Exported provider comparison to ${filePath}`);
  }
}