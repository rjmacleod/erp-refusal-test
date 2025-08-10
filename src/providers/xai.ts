import axios, { AxiosResponse } from 'axios';
import { BaseProvider } from './base';
import { ModelResponse, TestCase } from '../types';

export class XAIProvider extends BaseProvider {
  private readonly baseURL = 'https://api.x.ai/v1/chat/completions';
  
  getAvailableModels(): string[] {
    return [
      'grok-3',
      'grok-3-mini', 
      'grok-4-0709'
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
      'xai',
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
        provider: 'xai',
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
      throw new Error(`XAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  calculateCost(tokens: number): number {
    // Approximate cost calculation for Grok models (per 1K tokens)
    const costPer1K = 0.002; // Estimated cost per 1K output tokens
    return (tokens / 1000) * costPer1K;
  }
}