import Anthropic from '@anthropic-ai/sdk'
import { BaseLLMProvider, type LLMConfig, type LLMMessage, type LLMResponse, type LLMStreamCallback } from './base-provider'

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic

  constructor(config: LLMConfig) {
    super(config)
    this.client = new Anthropic({
      apiKey: config.apiKey
    })
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const systemMsg = messages.find(m => m.role === 'system')
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-6',
      max_tokens: this.config.maxTokens ?? 4096,
      system: systemMsg?.content,
      messages: chatMessages
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return {
      content: textBlock?.text || '',
      usage: {
        promptTokens: response.usage?.input_tokens ?? 0,
        completionTokens: response.usage?.output_tokens ?? 0
      }
    }
  }

  async chatStream(messages: LLMMessage[], callback: LLMStreamCallback): Promise<void> {
    try {
      const systemMsg = messages.find(m => m.role === 'system')
      const chatMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))

      const stream = await this.client.messages.create({
        model: this.config.model || 'claude-sonnet-4-6',
        max_tokens: this.config.maxTokens ?? 4096,
        system: systemMsg?.content,
        messages: chatMessages,
        stream: true
      })

      let fullContent = ''
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullContent += event.delta.text
          callback.onToken(event.delta.text)
        }
      }

      callback.onDone({ content: fullContent })
    } catch (err) {
      callback.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
