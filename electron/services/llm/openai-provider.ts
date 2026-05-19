import OpenAI from 'openai'
import { BaseLLMProvider, type LLMConfig, type LLMMessage, type LLMResponse, type LLMStreamCallback } from './base-provider'

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI

  constructor(config: LLMConfig) {
    super(config)
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1'
    })
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'gpt-4o',
      messages,
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 4096
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens
      } : undefined
    }
  }

  async chatStream(messages: LLMMessage[], callback: LLMStreamCallback): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4096,
        stream: true
      })

      let fullContent = ''
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || ''
        if (token) {
          fullContent += token
          callback.onToken(token)
        }
      }

      callback.onDone({ content: fullContent })
    } catch (err) {
      callback.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
