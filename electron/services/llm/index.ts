import { BaseLLMProvider, type LLMConfig } from './base-provider'
import { OpenAIProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'
import { OllamaProvider } from './ollama-provider'

export type ProviderType = 'openai' | 'anthropic' | 'ollama'

export function createProvider(type: ProviderType, config: LLMConfig): BaseLLMProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    default:
      throw new Error(`Unsupported provider: ${type}`)
  }
}

export { BaseLLMProvider } from './base-provider'
export type { LLMConfig } from './base-provider'
