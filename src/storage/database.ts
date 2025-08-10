import sqlite3 from 'sqlite3';
import { TestCase, ModelResponse, RefusalAnalysis, EvaluationResult } from '../types';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './erp_evaluation.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    const createTestCasesTable = `
      CREATE TABLE IF NOT EXISTS test_cases (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        character TEXT NOT NULL,
        model TEXT NOT NULL,
        model_name TEXT NOT NULL,
        intensity_level INTEGER NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME NOT NULL
      )
    `;

    const createModelResponsesTable = `
      CREATE TABLE IF NOT EXISTS model_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_case_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        response TEXT NOT NULL,
        response_time INTEGER NOT NULL,
        tokens INTEGER NOT NULL,
        cost REAL NOT NULL,
        timestamp DATETIME NOT NULL,
        metadata TEXT,
        FOREIGN KEY (test_case_id) REFERENCES test_cases (id)
      )
    `;

    const createRefusalAnalysesTable = `
      CREATE TABLE IF NOT EXISTS refusal_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_case_id TEXT NOT NULL,
        is_refusal BOOLEAN NOT NULL,
        confidence REAL NOT NULL,
        reason TEXT NOT NULL,
        detection_method TEXT NOT NULL,
        keywords TEXT,
        timestamp DATETIME NOT NULL,
        FOREIGN KEY (test_case_id) REFERENCES test_cases (id)
      )
    `;

    this.db.serialize(() => {
      this.db.run(createTestCasesTable);
      this.db.run(createModelResponsesTable);
      this.db.run(createRefusalAnalysesTable);
    });
  }

  saveTestCase(testCase: TestCase): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO test_cases (id, prompt, character, model, model_name, intensity_level, category, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(
        sql,
        [testCase.id, testCase.prompt, testCase.character, testCase.model, testCase.modelName,
         testCase.intensityLevel, testCase.category, testCase.createdAt.toISOString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  saveModelResponse(response: ModelResponse): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO model_responses (test_case_id, provider, model, response, response_time, tokens, cost, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(
        sql,
        [response.testCaseId, response.provider, response.model, response.response,
         response.responseTime, response.tokens, response.cost, response.timestamp.toISOString(),
         JSON.stringify(response.metadata)],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  saveRefusalAnalysis(analysis: RefusalAnalysis): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO refusal_analyses (test_case_id, is_refusal, confidence, reason, detection_method, keywords, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(
        sql,
        [analysis.testCaseId, analysis.isRefusal, analysis.confidence, analysis.reason,
         analysis.detectionMethod, JSON.stringify(analysis.keywords || []), analysis.timestamp.toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getEvaluationResults(): Promise<EvaluationResult[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          tc.id, tc.prompt, tc.character, tc.model, tc.model_name, tc.intensity_level, tc.category, tc.created_at,
          mr.provider, mr.model as response_model, mr.response, mr.response_time, mr.tokens, mr.cost, mr.timestamp as response_timestamp, mr.metadata,
          ra.is_refusal, ra.confidence, ra.reason, ra.detection_method, ra.keywords, ra.timestamp as analysis_timestamp
        FROM test_cases tc
        LEFT JOIN model_responses mr ON tc.id = mr.test_case_id
        LEFT JOIN refusal_analyses ra ON tc.id = ra.test_case_id
        ORDER BY tc.created_at DESC
      `;

      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const results: EvaluationResult[] = rows.map(row => ({
          testCase: {
            id: row.id,
            prompt: row.prompt,
            character: row.character,
            model: row.model,
            modelName: row.model_name,
            intensityLevel: row.intensity_level,
            category: row.category,
            createdAt: new Date(row.created_at)
          },
          response: {
            testCaseId: row.id,
            provider: row.provider,
            model: row.response_model,
            response: row.response,
            responseTime: row.response_time,
            tokens: row.tokens,
            cost: row.cost,
            timestamp: new Date(row.response_timestamp),
            metadata: JSON.parse(row.metadata || '{}')
          },
          analysis: {
            testCaseId: row.id,
            isRefusal: Boolean(row.is_refusal),
            confidence: row.confidence,
            reason: row.reason,
            detectionMethod: row.detection_method,
            keywords: JSON.parse(row.keywords || '[]'),
            timestamp: new Date(row.analysis_timestamp)
          }
        }));

        resolve(results);
      });
    });
  }

  getResultsByProvider(provider: string): Promise<EvaluationResult[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          tc.id, tc.prompt, tc.character, tc.model, tc.intensity_level, tc.category, tc.created_at,
          mr.provider, mr.model as response_model, mr.response, mr.response_time, mr.tokens, mr.cost, mr.timestamp as response_timestamp, mr.metadata,
          ra.is_refusal, ra.confidence, ra.reason, ra.detection_method, ra.keywords, ra.timestamp as analysis_timestamp
        FROM test_cases tc
        JOIN model_responses mr ON tc.id = mr.test_case_id
        JOIN refusal_analyses ra ON tc.id = ra.test_case_id
        WHERE mr.provider = ?
        ORDER BY tc.created_at DESC
      `;

      this.db.all(sql, [provider], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const results: EvaluationResult[] = rows.map(row => ({
          testCase: {
            id: row.id,
            prompt: row.prompt,
            character: row.character,
            model: row.model,
            modelName: row.model_name,
            intensityLevel: row.intensity_level,
            category: row.category,
            createdAt: new Date(row.created_at)
          },
          response: {
            testCaseId: row.id,
            provider: row.provider,
            model: row.response_model,
            response: row.response,
            responseTime: row.response_time,
            tokens: row.tokens,
            cost: row.cost,
            timestamp: new Date(row.response_timestamp),
            metadata: JSON.parse(row.metadata || '{}')
          },
          analysis: {
            testCaseId: row.id,
            isRefusal: Boolean(row.is_refusal),
            confidence: row.confidence,
            reason: row.reason,
            detectionMethod: row.detection_method,
            keywords: JSON.parse(row.keywords || '[]'),
            timestamp: new Date(row.analysis_timestamp)
          }
        }));

        resolve(results);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}