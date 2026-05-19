import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, FileType, Trash2, Clock, Sparkles, Loader2 } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { useKnowledgeTreeStore } from '@/stores/knowledge-tree-store'
import { cn } from '@/lib/utils'

export function LibraryView() {
  const { documents, loading, fetchDocuments, importDocument, deleteDocument } = useDocumentStore()
  const { createTree, addNode, updateNodeAnswer } = useKnowledgeTreeStore()
  const navigate = useNavigate()

  const [wizard, setWizard] = useState<{ docId: number; docTitle: string } | null>(null)
  const [wizardStatus, setWizardStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [wizardStreaming, setWizardStreaming] = useState('')
  const [filter, setFilter] = useState<'all' | 'reading' | 'new'>('all')

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleImport = async () => {
    const docId = await importDocument()
    if (docId) {
      setWizard({ docId, docTitle: '' })
    }
  }

  const handleWizardYes = async () => {
    if (!wizard) return
    setWizardStatus('loading')

    const docDetail = await window.electronAPI.invoke('documents:get', wizard.docId) as {
      title: string; chapters: { chapter_title: string; content: string }[]
    } | null
    if (!docDetail) {
      setWizard(null)
      setWizardStatus('idle')
      return
    }

    const fullText = docDetail.chapters.map(ch => ch.content).join('\n\n')
    const contextTreeId = await createTree(wizard.docId, `《${docDetail.title}》全文上下文`)

    if (!contextTreeId) {
      setWizard(null)
      setWizardStatus('idle')
      return
    }

    const nodeId = await addNode(contextTreeId, null, '全文通读与上下文建立', '', fullText.slice(0, 5000))

    if (!nodeId) {
      setWizard(null)
      setWizardStatus('idle')
      return
    }

    const cleanupToken = window.electronAPI.on('ai:streamToken', (token: unknown) => {
      setWizardStreaming(prev => prev + (token as string))
    })

    const cleanupDone = window.electronAPI.on('ai:streamDone', async (content: unknown) => {
      const finalContent = typeof content === 'string' ? content : ''
      await updateNodeAnswer(nodeId, finalContent, 'answered')

      cleanupToken()
      cleanupDone()
      cleanupError()
      setWizardStatus('done')
      setWizardStreaming('')

      setTimeout(() => {
        setWizard(null)
        setWizardStatus('idle')
        navigate(`/read/${wizard.docId}`)
      }, 1500)
    })

    const cleanupError = window.electronAPI.on('ai:streamError', () => {
      cleanupToken()
      cleanupDone()
      cleanupError()
      setWizard(null)
      setWizardStatus('idle')
    })

    window.electronAPI.invoke('ai:chatStream', [
      {
        role: 'system',
        content: `你是一个专业的知识管理AI。请仔细阅读以下文档全文，并生成一份结构化的上下文摘要。

要求：
1. 概括文档的核心主题和目的
2. 列出关键概念和术语及其简要定义
3. 梳理文档的结构脉络（章节逻辑关系）
4. 标注重要的数据、事实或结论
5. 指出可能需要深入理解的知识点

请使用 Markdown 格式输出，包含标题、列表和重点标注。这份摘要将作为后续问答的上下文基础。`
      },
      {
        role: 'user',
        content: `请通读以下文档并建立上下文：\n\n${fullText.slice(0, 60000)}`
      }
    ])
  }

  const handleWizardNo = () => {
    const docId = wizard?.docId
    setWizard(null)
    setWizardStatus('idle')
    if (docId) navigate(`/read/${docId}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await deleteDocument(id)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const filteredDocs = documents.filter(doc => {
    if (filter === 'reading') return doc.current_page > 0 && doc.current_page < doc.total_pages
    if (filter === 'new') return doc.current_page === 0
    return true
  })

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-panel">
        <div className="flex items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">书架</h1>
            <p className="text-sm text-muted-foreground mt-0.5">管理你的阅读文档，开启 AI 辅助学习</p>
          </div>
          <button onClick={handleImport} className="btn-brand text-sm">
            <Plus className="h-4 w-4" />
            导入文档
          </button>
        </div>
        <div className="flex gap-1 px-8 pb-3">
          {([
            { key: 'all', label: '全部' },
            { key: 'reading', label: '进行中' },
            { key: 'new', label: '未读' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            加载中...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">{documents.length === 0 ? '还没有导入任何文档' : '没有匹配的文档'}</p>
            {documents.length === 0 && (
              <button onClick={handleImport} className="mt-3 text-sm text-primary hover:underline">
                导入第一本书
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/read/${doc.id}`)}
                className="card cursor-pointer p-5 group relative"
              >
                <div className={cn(
                  'flex items-center justify-center h-36 rounded-xl mb-4',
                  doc.file_type === 'pdf'
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-50',
                )}>
                  {doc.file_type === 'pdf' ? (
                    <FileType className="h-10 w-10 text-amber-600/70" />
                  ) : (
                    <FileText className="h-10 w-10 text-blue-600/70" />
                  )}
                </div>
                <h3 className="font-medium text-sm truncate" title={doc.title}>{doc.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {doc.file_type.toUpperCase()} · {formatSize(doc.file_size)}
                </p>
                {doc.total_pages > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(doc.current_page / doc.total_pages) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {doc.current_page > 0 ? `${Math.round((doc.current_page / doc.total_pages) * 100)}%` : '新'}
                    </span>
                  </div>
                )}
                {doc.last_read_at && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {doc.last_read_at.slice(0, 10)}
                  </p>
                )}
                <button
                  onClick={(e) => handleDelete(e, doc.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import wizard modal */}
      {wizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 fade-in border border-border">
            {wizardStatus === 'loading' ? (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <h2 className="text-lg font-semibold mb-2">AI 正在通读全文...</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  正在分析文档结构、提取关键概念、建立上下文索引
                </p>
                {wizardStreaming && (
                  <div className="text-xs text-left text-muted-foreground max-h-32 overflow-auto bg-muted rounded-lg p-3 markdown-content">
                    {wizardStreaming.slice(-300)}
                  </div>
                )}
              </div>
            ) : wizardStatus === 'done' ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold mb-1">上下文建立完成</h2>
                <p className="text-sm text-muted-foreground">即将进入阅读...</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-2 tracking-tight">需要 AI 建立全文上下文吗？</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI 将通读整篇文档，自动提取核心概念、梳理结构脉络、标注关键知识点。
                      之后你可以基于这份上下文进行深入问答，AI 回答会更加准确和全面。
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleWizardNo}
                    className="btn-secondary text-sm"
                  >
                    跳过，直接阅读
                  </button>
                  <button
                    onClick={handleWizardYes}
                    className="btn-brand text-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    让 AI 通读全文
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
