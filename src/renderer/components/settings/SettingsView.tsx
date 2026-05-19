import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { useSettingsStore, type LLMSettings } from '@/stores/settings-store'

const providerOptions = [
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o', defaultUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', defaultModel: 'claude-sonnet-4-6', defaultUrl: '' },
  { value: 'ollama', label: 'Ollama (本地)', defaultModel: 'llama3', defaultUrl: 'http://localhost:11434' }
]

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
      baseUrl: opt?.defaultUrl || ''
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
      error: result.error
    })
  }

  const provider = form.provider || 'openai'

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold mb-6">设置</h1>

        <div className="space-y-5">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium mb-1.5">AI 服务</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as LLMSettings['provider'])}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            >
              {providerOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey || ''}
                onChange={(e) => updateField('apiKey', e.target.value)}
                placeholder="输入 API Key"
                className="w-full rounded-xl border bg-background px-3 py-2 pr-10 text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Base URL {provider === 'ollama' && <span className="text-muted-foreground">(Ollama 默认)</span>}
            </label>
            <input
              type="text"
              value={form.baseUrl || ''}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              placeholder={providerOptions.find(o => o.value === provider)?.defaultUrl}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium mb-1.5">模型</label>
            <input
              type="text"
              value={form.model || ''}
              onChange={(e) => updateField('model', e.target.value)}
              placeholder="输入模型名称"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Temperature & Max Tokens */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Temperature</label>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={form.temperature ?? 0.7}
                onChange={(e) => updateField('temperature', Number(e.target.value))}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Max Tokens</label>
              <input
                type="number"
                min={100}
                max={128000}
                step={100}
                value={form.maxTokens ?? 4096}
                onChange={(e) => updateField('maxTokens', Number(e.target.value))}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              className="btn-brand text-sm"
            >
              {saved ? '已保存 ✓' : '保存设置'}
            </button>
            <button
              onClick={handleTest}
              disabled={testResult.status === 'testing'}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {testResult.status === 'testing' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> 测试中...
                </span>
              ) : '测试连接'}
            </button>

            {testResult.status === 'success' && (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" /> 连接成功
              </span>
            )}
            {testResult.status === 'error' && (
              <span className="inline-flex items-center gap-1 text-sm text-red-600" title={testResult.error}>
                <XCircle className="h-4 w-4" /> {testResult.error}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
