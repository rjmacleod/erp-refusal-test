import fs from 'fs/promises';
import path from 'path';

export class FileLogger {
  private logDir: string;
  private sessionId: string;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.ensureLogDir();
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  private getLogFileName(provider: string): string {
    return path.join(this.logDir, `${provider}_requests_${this.sessionId}.log`);
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  async logRequest(
    provider: string,
    testCaseId: string,
    modelName: string,
    character: string,
    intensity: number,
    category: string,
    requestData: any,
    formattedPrompt: string
  ): Promise<void> {
    const logEntry = {
      timestamp: this.getCurrentTimestamp(),
      provider: provider.toUpperCase(),
      testCaseId,
      modelName,
      character,
      intensity,
      category,
      requestData,
      formattedPrompt
    };

    const logText = `
=====================================
${logEntry.timestamp} - ${logEntry.provider} REQUEST
=====================================
Model: ${logEntry.modelName}
Test Case ID: ${logEntry.testCaseId}
Character: ${logEntry.character}
Intensity: ${logEntry.intensity}
Category: ${logEntry.category}

Full Request Data:
${JSON.stringify(logEntry.requestData, null, 2)}

Formatted Prompt:
"${logEntry.formattedPrompt}"
=====================================

`;

    try {
      const logFile = this.getLogFileName(provider);
      await fs.appendFile(logFile, logText, 'utf-8');
    } catch (error) {
      console.error(`Failed to write to ${provider} log file:`, error);
    }
  }

  async logResponse(
    provider: string,
    testCaseId: string,
    response: string,
    responseTime: number,
    tokens: number,
    refusalResult?: { refused: boolean; confidence: number }
  ): Promise<void> {
    const logEntry = {
      timestamp: this.getCurrentTimestamp(),
      provider: provider.toUpperCase(),
      testCaseId,
      response: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
      responseTime,
      tokens,
      refusalResult
    };

    const logText = `
RESPONSE for ${logEntry.testCaseId}:
Response Time: ${logEntry.responseTime}ms
Tokens: ${logEntry.tokens}
Refusal Analysis: ${logEntry.refusalResult ? 
  `${logEntry.refusalResult.refused ? 'REFUSED' : 'ACCEPTED'} (confidence: ${logEntry.refusalResult.confidence.toFixed(2)})` 
  : 'N/A'}

Response (first 500 chars):
"${logEntry.response}"
-------------------------------------

`;

    try {
      const logFile = this.getLogFileName(provider);
      await fs.appendFile(logFile, logText, 'utf-8');
    } catch (error) {
      console.error(`Failed to write response to ${provider} log file:`, error);
    }
  }

  async logSessionSummary(
    totalTests: number,
    completedTests: number,
    failedTests: number,
    duration: number
  ): Promise<void> {
    const summaryText = `
=====================================
SESSION SUMMARY - ${this.getCurrentTimestamp()}
=====================================
Session ID: ${this.sessionId}
Total Tests: ${totalTests}
Completed: ${completedTests}
Failed: ${failedTests}
Duration: ${duration}ms
Success Rate: ${((completedTests / totalTests) * 100).toFixed(2)}%
=====================================

`;

    try {
      const summaryFile = path.join(this.logDir, `session_summary_${this.sessionId}.log`);
      await fs.writeFile(summaryFile, summaryText, 'utf-8');
    } catch (error) {
      console.error('Failed to write session summary:', error);
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getLogDirectory(): string {
    return this.logDir;
  }
}