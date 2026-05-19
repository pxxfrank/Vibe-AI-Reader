import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Zap } from 'lucide-react'
import { useSettingsStore, type LLMSettings } from '@/stores/settings-store'
import { cn } from '@/lib/utils'

const providerOptions = [
  { value: 'openai', label: 'OpenAI', icon: '⚡', defaultModel: 'gpt-4o', defaultUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', icon: '🧠', defaultModel: 'claude-sonnet-4-6', defaultUrl: '' },
  { value: 'ollama', label: 'Ollama', icon: '🦙', defaultModel: 'llama3', defaultUrl: 'http://localhost:11434' },
]

const modelOptions: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o3-mini', 'o1-preview'],
  anthropic: ['claude-sonnet-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-7'],
  ollama: ['llama3', 'llama3.1', 'mistral', 'qwen2', 'deepseek-r1'],
}

export function SettingsView() {
  const { settings, loaded, fetchSettings, saveSettings, testConnection } = useSettingsStore()
  const [form, setForm] = useState<Partial<LLMSettings>>({})
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; error?: string }>({ status: 'idle' })
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (loaded) {
      setForm({ ...settings })
    }
  }, [loaded, settings])

  const updateField = <K extends keyof LLMSettings>(key: K, value: LLMSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleProviderChange = (provider: LLMSettings['provider']) => {
    const opt = providerOptions.find(o => o.value === provider)
    setForm(prev => ({
      ...prev,
      provider,
      model: opt?.defaultModel || '',
      baseUrl: opt?.defaultUrl || '',
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    await saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    await saveSettings(form)
    setTestResult({ status: 'testing' })
    const result = await testConnection()
    setTestResult({
      status: result.success ? 'success' : 'error',
      error: result.error,
    })
  }

  const provider = form.provider || 'openai'
  const models = modelOptions[provider] || []

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-lg mx-auto py-10 px-8">
        <h1 className="text-xl font-semibold tracking-tight mb-8">设置</h1>

        <div className="space-y-6">
          {/* Provider selector — card style */}
          <div>
            <label className="block text-sm font-medium mb-3">AI 服务</label>
            <div className="grid grid-cols-3 gap-2">
              {providerOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleProviderChange(opt.value as LLMSettings['provider'])}
                  className={cn(
                    'px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center gap-1',
                    provider === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/30 hover:bg-secondary',
                  )}
                >
                  <span className="text-lg">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey || ''}
                onChange={(e) => updateField('apiKey', e.target.value)}
                placeholder="输入 API Key"
                className="w-full rounded-xl border bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">密钥存储在本地，不会上传到任何服务器</p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API Base URL
              {provider === 'ollama' && <span className="text-muted-foreground font-normal">（Ollama 默认）</span>}
            </label>
            <input
              type="text"
              value={form.baseUrl || ''}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              placeholder={providerOptions.find(o => o.value === provider)?.defaultUrl}
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          {/* Model — dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2">模型</label>
            <select
              value={form.model || ''}
              onChange={(e) => updateField('model', e.target.value)}
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            >
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              {!models.includes(form.model || '') && (
                <option value={form.model}>{form.model}</option>
              )}
            </select>
          </div>

          {/* Temperature — slider + Max Tokens */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Temperature <span className="text-muted-foreground font-normal">{form.temperature ?? 0.7}</span>
              </label>
              <div className="relative px-1">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature ?? 0.7}
                  onChange={(e) => updateField('temperature', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>精确</span>
                  <span>创意</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Tokens</label>
              <input
                type="number"
                min={100}
                max={128000}
                step={100}
                value={form.maxTokens ?? 4096}
                onChange={(e) => updateField('maxTokens', Number(e.target.value))}
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2">System Prompt</label>
            <textarea
              rows={3}
              value={form.systemPrompt || ''}
              onChange={(e) => updateField('systemPrompt', e.target.value)}
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              placeholder="自定义 AI 的系统提示..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} className="btn-brand text-sm">
              {saved ? '已保存 ✓' : '保存设置'}
            </button>
            <button
              onClick={handleTest}
              disabled={testResult.status === 'testing'}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {testResult.status === 'testing' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> 测试中...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-4 w-4" /> 测试连接
                </span>
              )}
            </button>

            {testResult.status === 'success' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" /> 连接成功
              </span>
            )}
            {testResult.status === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-600" title={testResult.error}>
                <XCircle className="h-4 w-4" /> {testResult.error}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
