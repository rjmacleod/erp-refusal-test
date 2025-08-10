import { BaseProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { XAIProvider } from './xai';
import { ModelProvider, ProviderConfig } from '../types';
import { FileLogger } from '../utils/fileLogger';

export class ProviderFactory {
  static createProvider(provider: ModelProvider, config: ProviderConfig, logger?: FileLogger): BaseProvider {
    switch (provider) {
      case 'anthropic':
        return new AnthropicProvider(config, logger);
      case 'openai':
        return new OpenAIProvider(config, logger);
      case 'xai':
        return new XAIProvider(config, logger);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

export { BaseProvider, AnthropicProvider, OpenAIProvider, XAIProvider };