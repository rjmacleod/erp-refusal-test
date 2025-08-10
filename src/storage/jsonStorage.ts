import fs from 'fs/promises';
import path from 'path';
import { TestCase, ModelResponse, RefusalAnalysis, EvaluationResult } from '../types';

export class JSONStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.ensureDataDir();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'test_cases'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'responses'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'analyses'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'results'), { recursive: true });
    } catch (error) {
      console.error('Error creating data directories:', error);
    }
  }

  async saveTestCase(testCase: TestCase): Promise<void> {
    const filePath = path.join(this.dataDir, 'test_cases', `${testCase.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(testCase, null, 2));
  }

  async saveModelResponse(response: ModelResponse): Promise<void> {
    const filePath = path.join(this.dataDir, 'responses', `${response.testCaseId}_${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(response, null, 2));
  }

  async saveRefusalAnalysis(analysis: RefusalAnalysis): Promise<void> {
    const filePath = path.join(this.dataDir, 'analyses', `${analysis.testCaseId}_${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(analysis, null, 2));
  }

  async saveEvaluationResult(result: EvaluationResult): Promise<void> {
    const filePath = path.join(this.dataDir, 'results', `${result.testCase.id}_${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(result, null, 2));
  }

  async loadTestCases(): Promise<TestCase[]> {
    try {
      const testCasesDir = path.join(this.dataDir, 'test_cases');
      const files = await fs.readdir(testCasesDir);
      const testCases: TestCase[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(testCasesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const testCase = JSON.parse(content);
          testCase.createdAt = new Date(testCase.createdAt);
          testCases.push(testCase);
        }
      }

      return testCases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error loading test cases:', error);
      return [];
    }
  }

  async loadModelResponses(): Promise<ModelResponse[]> {
    try {
      const responsesDir = path.join(this.dataDir, 'responses');
      const files = await fs.readdir(responsesDir);
      const responses: ModelResponse[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(responsesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const response = JSON.parse(content);
          response.timestamp = new Date(response.timestamp);
          responses.push(response);
        }
      }

      return responses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error loading model responses:', error);
      return [];
    }
  }

  async loadRefusalAnalyses(): Promise<RefusalAnalysis[]> {
    try {
      const analysesDir = path.join(this.dataDir, 'analyses');
      const files = await fs.readdir(analysesDir);
      const analyses: RefusalAnalysis[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(analysesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const analysis = JSON.parse(content);
          analysis.timestamp = new Date(analysis.timestamp);
          analyses.push(analysis);
        }
      }

      return analyses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error loading refusal analyses:', error);
      return [];
    }
  }

  async loadEvaluationResults(): Promise<EvaluationResult[]> {
    try {
      const resultsDir = path.join(this.dataDir, 'results');
      const files = await fs.readdir(resultsDir);
      const results: EvaluationResult[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(resultsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const result = JSON.parse(content);
          
          // Convert date strings back to Date objects
          result.testCase.createdAt = new Date(result.testCase.createdAt);
          result.response.timestamp = new Date(result.response.timestamp);
          result.analysis.timestamp = new Date(result.analysis.timestamp);
          
          results.push(result);
        }
      }

      return results.sort((a, b) => b.testCase.createdAt.getTime() - a.testCase.createdAt.getTime());
    } catch (error) {
      console.error('Error loading evaluation results:', error);
      return [];
    }
  }

  async saveBatchResults(results: EvaluationResult[], batchId: string): Promise<void> {
    const filePath = path.join(this.dataDir, 'results', `batch_${batchId}_${Date.now()}.json`);
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
  }

  async clearData(): Promise<void> {
    try {
      const dirs = ['test_cases', 'responses', 'analyses', 'results'];
      for (const dir of dirs) {
        const dirPath = path.join(this.dataDir, dir);
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          await fs.unlink(path.join(dirPath, file));
        }
      }
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}