import { Database } from './database';
import { JSONStorage } from './jsonStorage';
import { TestCase, ModelResponse, RefusalAnalysis, EvaluationResult } from '../types';

export class StorageManager {
  private database?: Database;
  private jsonStorage?: JSONStorage;

  constructor(options: { 
    useDatabase?: boolean; 
    dbPath?: string; 
    useJSON?: boolean; 
    dataDir?: string; 
  } = {}) {
    if (options.useDatabase !== false) {
      this.database = new Database(options.dbPath);
    }
    
    if (options.useJSON !== false) {
      this.jsonStorage = new JSONStorage(options.dataDir);
    }
  }

  async saveTestCase(testCase: TestCase): Promise<void> {
    const promises: Promise<any>[] = [];
    
    if (this.database) {
      promises.push(this.database.saveTestCase(testCase));
    }
    
    if (this.jsonStorage) {
      promises.push(this.jsonStorage.saveTestCase(testCase));
    }

    await Promise.all(promises);
  }

  async saveModelResponse(response: ModelResponse): Promise<void> {
    const promises: Promise<any>[] = [];
    
    if (this.database) {
      promises.push(this.database.saveModelResponse(response));
    }
    
    if (this.jsonStorage) {
      promises.push(this.jsonStorage.saveModelResponse(response));
    }

    await Promise.all(promises);
  }

  async saveRefusalAnalysis(analysis: RefusalAnalysis): Promise<void> {
    const promises: Promise<any>[] = [];
    
    if (this.database) {
      promises.push(this.database.saveRefusalAnalysis(analysis));
    }
    
    if (this.jsonStorage) {
      promises.push(this.jsonStorage.saveRefusalAnalysis(analysis));
    }

    await Promise.all(promises);
  }

  async saveEvaluationResult(result: EvaluationResult): Promise<void> {
    await this.saveTestCase(result.testCase);
    await this.saveModelResponse(result.response);
    await this.saveRefusalAnalysis(result.analysis);
    
    if (this.jsonStorage) {
      await this.jsonStorage.saveEvaluationResult(result);
    }
  }

  async getEvaluationResults(): Promise<EvaluationResult[]> {
    if (this.database) {
      return this.database.getEvaluationResults();
    } else if (this.jsonStorage) {
      return this.jsonStorage.loadEvaluationResults();
    } else {
      return [];
    }
  }

  async getResultsByProvider(provider: string): Promise<EvaluationResult[]> {
    if (this.database) {
      return this.database.getResultsByProvider(provider);
    } else if (this.jsonStorage) {
      const results = await this.jsonStorage.loadEvaluationResults();
      return results.filter(result => result.response.provider === provider);
    } else {
      return [];
    }
  }

  async saveBatchResults(results: EvaluationResult[], batchId: string): Promise<void> {
    for (const result of results) {
      await this.saveEvaluationResult(result);
    }
    
    if (this.jsonStorage) {
      await this.jsonStorage.saveBatchResults(results, batchId);
    }
  }

  close(): void {
    if (this.database) {
      this.database.close();
    }
  }
}

export { Database, JSONStorage };