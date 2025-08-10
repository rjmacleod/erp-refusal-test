import axios, { AxiosResponse } from 'axios';
import { BaseProvider } from './base';
import { ModelResponse, TestCase } from '../types';

export class AnthropicProvider extends BaseProvider {
  private readonly baseURL = 'https://api.anthropic.com/v1/messages';
  
  getAvailableModels(): string[] {
    return [
      'claude-opus-4-1-20250805',
      'claude-sonnet-4-20250514',
      'claude-3-5-haiku-20241022'
    ];
  }

  async generateResponse(testCase: TestCase): Promise<ModelResponse> {
    await this.rateLimitWait();
    
    const startTime = Date.now();
    const formattedPrompt = this.formatPrompt(testCase);
    const requestData = {
      model: testCase.modelName,
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: formattedPrompt
        }
      ]
    };

    // Log the complete request context to file
    await this.logger.logRequest(
      'anthropic',
      testCase.id,
      requestData.model,
      testCase.character,
      testCase.intensityLevel,
      testCase.category,
      requestData,
      formattedPrompt
    );
    
    try {
      const response: AxiosResponse = await axios.post(
        this.baseURL,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;
      const tokens = response.data.usage?.output_tokens || 0;
      const responseText = response.data.content[0].text;

      // Response will be logged by evaluator with refusal analysis

      return {
        testCaseId: testCase.id,
        provider: 'anthropic',
        model: testCase.modelName,
        response: responseText,
        responseTime,
        tokens,
        cost: this.calculateCost(tokens),
        timestamp: new Date(),
        metadata: {
          usage: response.data.usage,
          stopReason: response.data.stop_reason
        }
      };
    } catch (error: any) {
      throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  calculateCost(tokens: number): number {
    // Approximate cost calculation for Claude models (per 1K tokens)
    const costPer1K = 0.003; // $0.003 per 1K output tokens for Sonnet
    return (tokens / 1000) * costPer1K;
  }
}