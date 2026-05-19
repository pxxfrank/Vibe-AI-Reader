import { create } from 'zustand'

export interface LLMSettings {
  provider: 'openai' | 'anthropic' | 'ollama'
  apiKey: string
  model: string
  baseUrl: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

interface SettingsState {
  settings: Partial<LLMSettings>
  loading: boolean
  loaded: boolean
  fetchSettings: () => Promise<void>
  saveSettings: (settings: Partial<LLMSettings>) => Promise<void>
  testConnection: () => Promise<{ success: boolean; error?: string }>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,
  loaded: false,

  fetchSettings: async () => {
    set({ loading: true })
    const all = await window.electronAPI.invoke('settings:getAll') as Record<string, string>
    set({
      settings: {
        provider: (all['llm.provider'] || 'openai') as LLMSettings['provider'],
        apiKey: all['llm.apiKey'] || '',
        model: all['llm.model'] || 'gpt-4o',
        baseUrl: all['llm.baseUrl'] || '',
        temperature: all['llm.temperature'] ? Number(all['llm.temperature']) : 0.7,
        maxTokens: all['llm.maxTokens'] ? Number(all['llm.maxTokens']) : 4096,
        systemPrompt: all['llm.systemPrompt'] || '',
      },
      loading: false,
      loaded: true
    })
  },

  saveSettings: async (newSettings) => {
    const merged = { ...get().settings, ...newSettings }
    const kv: Record<string, string> = {}
    if (merged.provider !== undefined) kv['llm.provider'] = merged.provider
    if (merged.apiKey !== undefined) kv['llm.apiKey'] = merged.apiKey
    if (merged.model !== undefined) kv['llm.model'] = merged.model
    if (merged.baseUrl !== undefined) kv['llm.baseUrl'] = merged.baseUrl
    if (merged.temperature !== undefined) kv['llm.temperature'] = String(merged.temperature)
    if (merged.maxTokens !== undefined) kv['llm.maxTokens'] = String(merged.maxTokens)
    if (merged.systemPrompt !== undefined) kv['llm.systemPrompt'] = merged.systemPrompt

    await window.electronAPI.invoke('settings:setAll', kv)
    set({ settings: merged })
  },

  testConnection: async () => {
    const result = await window.electronAPI.invoke('ai:testConnection') as { success: boolean; error?: string }
    return result
  }
}))
