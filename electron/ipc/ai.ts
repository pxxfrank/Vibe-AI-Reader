import { ipcMain, BrowserWindow } from 'electron'
import { getDatabase, queryAll } from '../services/database'
import { createProvider, type ProviderType, type LLMConfig } from '../services/llm'
import type { LLMMessage } from '../services/llm/base-provider'

async function buildProvider(): Promise<{ type: ProviderType; provider: ReturnType<typeof createProvider> } | null> {
  const rows = queryAll("SELECT key, value FROM settings WHERE key LIKE 'llm.%'")

  const settings: Record<string, string> = {}
  for (const row of rows) {
    const r = row as Record<string, string>
    settings[r.key] = r.value
  }

  const type = (settings['llm.provider'] || 'openai') as ProviderType
  const config: LLMConfig = {
    apiKey: settings['llm.apiKey'] || '',
    model: settings['llm.model'] || 'gpt-4o',
    baseUrl: settings['llm.baseUrl'] || undefined,
    temperature: settings['llm.temperature'] ? Number(settings['llm.temperature']) : 0.7,
    maxTokens: settings['llm.maxTokens'] ? Number(settings['llm.maxTokens']) : 4096,
    systemPrompt: settings['llm.systemPrompt'] || '你是一个帮助理解文档内容的AI助手。请基于提供的文档内容回答问题。如果文档中没有相关信息，请如实说明。'
  }

  if (!config.apiKey) return null

  return { type, provider: createProvider(type, config) }
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:chat', async (event, messages: LLMMessage[]) => {
    const result = await buildProvider()
    if (!result) {
      return { success: false, error: '请先配置 AI 服务的 API Key' }
    }
    try {
      const response = await result.provider.chat(messages)
      return { success: true, content: response.content, usage: response.usage }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:chatStream', async (event, messages: LLMMessage[]) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false, error: 'No window' }

    const result = await buildProvider()
    if (!result) {
      win.webContents.send('ai:streamError', '请先配置 AI 服务的 API Key')
      win.webContents.send('ai:streamDone')
      return { success: false }
    }

    try {
      await result.provider.chatStream(messages, {
        onToken: (token) => {
          win.webContents.send('ai:streamToken', token)
        },
        onDone: (response) => {
          win.webContents.send('ai:streamDone', response.content)
        },
        onError: (err) => {
          win.webContents.send('ai:streamError', err.message)
          win.webContents.send('ai:streamDone')
        }
      })
      return { success: true }
    } catch (err) {
      win.webContents.send('ai:streamError', String(err))
      win.webContents.send('ai:streamDone')
      return { success: false }
    }
  })

  ipcMain.handle('ai:summarize', async (_event, text: string) => {
    const result = await buildProvider()
    if (!result) {
      return { success: false, error: '请先配置 AI 服务的 API Key' }
    }
    try {
      const response = await result.provider.chat([
        {
          role: 'system',
          content: '你是一个善于总结文档的AI助手。请用简洁的中文总结以下内容，提取关键要点。'
        },
        { role: 'user', content: `请总结以下内容：\n\n${text.slice(0, 30000)}` }
      ])
      return { success: true, content: response.content }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:testConnection', async () => {
    const result = await buildProvider()
    if (!result) {
      return { success: false, error: '请先配置 AI 服务的 API Key' }
    }
    try {
      await result.provider.chat([
        { role: 'user', content: 'Hello, just testing. Reply with "OK".' }
      ])
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
