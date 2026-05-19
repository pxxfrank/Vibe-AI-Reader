import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, FileType, Trash2, Clock, Sparkles, Loader2 } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { useKnowledgeTreeStore } from '@/stores/knowledge-tree-store'
import { cn } from '@/lib/utils'

export function LibraryView() {
  const { documents, loading, fetchDocuments, importDocument, deleteDocument } = useDocumentStore()
  const { createTree, addNode, updateNodeAnswer, loadTree } = useKnowledgeTreeStore()
  const navigate = useNavigate()

  const [wizard, setWizard] = useState<{ docId: number; docTitle: string } | null>(null)
  const [wizardStatus, setWizardStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [wizardStreaming, setWizardStreaming] = useState('')

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

    // Get document detail to access full text
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

    // Add root node — this will hold the AI-generated context summary
    const nodeId = await addNode(contextTreeId, null, '全文通读与上下文建立', '', fullText.slice(0, 5000))

    if (!nodeId) {
      setWizard(null)
      setWizardStatus('idle')
      return
    }

    // Stream AI to build context
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

      // Navigate after a brief pause so user sees completion
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

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">书架</h1>
        <button onClick={handleImport} className="btn-brand inline-flex items-center gap-2">
          <Plus className="h-5 w-5" />
          导入文档
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          加载中...
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">还没有导入任何文档</p>
          <button onClick={handleImport} className="mt-3 text-sm text-primary hover:underline">
            导入第一本书
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/read/${doc.id}`)}
              className="group cursor-pointer rounded-2xl border border-white/20 bg-background/60 backdrop-blur-md p-5 hover:border-brand-from/30 hover:shadow-[0_8px_30px_rgba(102,126,234,0.15)] hover:-translate-y-1 transition-all duration-300 relative"
            >
              <div className={cn(
                'flex items-center justify-center h-32 rounded-xl mb-4',
                doc.file_type === 'pdf'
                  ? 'bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500'
                  : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-brand'
              )}>
                {doc.file_type === 'pdf' ? <FileType className="h-10 w-10" /> : <FileText className="h-10 w-10" />}
              </div>
              <h3 className="font-medium text-sm truncate" title={doc.title}>{doc.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {doc.file_type.toUpperCase()} · {formatSize(doc.file_size)}
              </p>
              {doc.total_pages > 1 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-1 flex-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(doc.current_page / doc.total_pages) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{doc.current_page}/{doc.total_pages}</span>
                </div>
              )}
              {doc.last_read_at && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {doc.last_read_at.slice(0, 10)}
                </div>
              )}
              <button
                onClick={(e) => handleDelete(e, doc.id)}
                className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Import wizard modal */}
      {wizard && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="glass-strong rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
            {wizardStatus === 'loading' ? (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <h2 className="text-lg font-semibold mb-2">AI 正在通读全文...</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  正在分析文档结构、提取关键概念、建立上下文索引
                </p>
                {wizardStreaming && (
                  <div className="text-xs text-left text-muted-foreground max-h-32 overflow-auto bg-muted/30 rounded p-3 markdown-content">
                    {wizardStreaming.slice(-300)}
                  </div>
                )}
              </div>
            ) : wizardStatus === 'done' ? (
              <div className="text-center py-4">
                <CheckCircleIcon className="h-8 w-8 mx-auto mb-3 text-green-500" />
                <h2 className="text-lg font-semibold mb-1">上下文建立完成</h2>
                <p className="text-sm text-muted-foreground">即将进入阅读...</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-full bg-primary/10 shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-2">是否需要 AI 建立全文上下文？</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI 将通读整篇文档，自动提取核心概念、梳理结构脉络、标注关键知识点。
                      之后你可以基于这份上下文进行深入问答，AI 回答会更加准确和全面。
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleWizardNo}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    跳过，直接阅读
                  </button>
                  <button
                    onClick={handleWizardYes}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
