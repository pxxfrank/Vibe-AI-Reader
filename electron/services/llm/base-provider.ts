export interface LLMConfig {
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface LLMStreamCallback {
  onToken: (token: string) => void
  onDone: (response: LLMResponse) => void
  onError: (error: Error) => void
}

export abstract class BaseLLMProvider {
  protected config: LLMConfig

  constructor(config: LLMConfig) {
    this.config = config
  }

  abstract chat(messages: LLMMessage[]): Promise<LLMResponse>
  abstract chatStream(messages: LLMMessage[], callback: LLMStreamCallback): Promise<void>
}
