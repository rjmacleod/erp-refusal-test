import axios, { AxiosResponse } from 'axios';
import { BaseProvider } from './base';
import { ModelResponse, TestCase } from '../types';

export class OpenAIProvider extends BaseProvider {
  private readonly baseURL = 'https://api.openai.com/v1/chat/completions';
  
  getAvailableModels(): string[] {
    return [
      'gpt-5',
      'gpt-5-mini'
    ];
  }

  async generateResponse(testCase: TestCase): Promise<ModelResponse> {
    await this.rateLimitWait();
    
    const startTime = Date.now();
    const formattedPrompt = this.formatPrompt(testCase);
    const requestData = {
      model: testCase.modelName,
      messages: [
        {
          role: 'user',
          content: formattedPrompt
        }
      ]
    };

    // Log the complete request context to file
    await this.logger.logRequest(
      'openai',
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
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;
      const tokens = response.data.usage?.completion_tokens || 0;
      const responseText = response.data.choices[0].message.content;

      // Response will be logged by evaluator with refusal analysis

      return {
        testCaseId: testCase.id,
        provider: 'openai',
        model: testCase.modelName,
        response: responseText,
        responseTime,
        tokens,
        cost: this.calculateCost(tokens),
        timestamp: new Date(),
        metadata: {
          usage: response.data.usage,
          finishReason: response.data.choices[0].finish_reason
        }
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  calculateCost(tokens: number): number {
    // Approximate cost calculation for GPT models (per 1K tokens)
    const costPer1K = 0.002; // $0.002 per 1K output tokens for GPT-4o
    return (tokens / 1000) * costPer1K;
  }
}