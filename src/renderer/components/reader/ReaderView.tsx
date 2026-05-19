import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, MessageSquare, PanelRightClose, PanelRightOpen, FileText, Image } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { useKnowledgeTreeStore } from '@/stores/knowledge-tree-store'
import { useThemeStore } from '@/stores/theme-store'
import { KnowledgeTreePanel } from '@/components/knowledge-tree/KnowledgeTreePanel'
import { PdfViewer } from '@/components/reader/PdfViewer'
import { cn } from '@/lib/utils'

export function ReaderView() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const { currentDocument, openDocument, updateProgress } = useDocumentStore()
  const { currentTree, createTree, loadTree, addNode, selectNode, setStreaming, appendStreamToken, finishStreaming } = useKnowledgeTreeStore()
  const { theme } = useThemeStore()
  const contentRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const [fontSize, setFontSize] = useState(16)
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiPanelWidth, setAiPanelWidth] = useState(420)
  const [selectedText, setSelectedText] = useState('')
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text')

  useEffect(() => {
    if (documentId) {
      openDocument(Number(documentId))
    }
  }, [documentId, openDocument])

  useEffect(() => {
    if (currentDocument && currentDocument.file_type === 'pdf') {
      const hasContent = currentDocument.chapters.some(ch => ch.content && ch.content.length > 10)
      if (!hasContent) {
        setViewMode('pdf')
      }
    }
  }, [currentDocument])

  const handleScroll = useCallback(() => {
    if (!contentRef.current || !currentDocument) return
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current
    const progress = scrollTop / (scrollHeight - clientHeight)
    const estimatedPage = Math.round(progress * currentDocument.total_pages)
    updateProgress(currentDocument.id, Math.max(currentDocument.current_page, estimatedPage))
  }, [currentDocument, updateProgress])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startWidth: aiPanelWidth }
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }, [aiPanelWidth])

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return
    const delta = resizeRef.current.startX - e.clientX
    const newWidth = Math.min(700, Math.max(300, resizeRef.current.startWidth + delta))
    setAiPanelWidth(newWidth)
  }, [])

  const onResizeEnd = useCallback(() => {
    resizeRef.current = null
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  }, [onResizeMove])

  const handleTextSelection = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim().length > 0) {
        setSelectedText(selection.toString().trim())
      }
    }, 100)
  }, [])

  const handleAskAI = async () => {
    if (!selectedText || !documentId) return

    const docId = Number(documentId)

    let treeId = currentTree?.id
    if (!treeId) {
      const title = `关于《${currentDocument?.title || '文档'}》的探索`
      treeId = await createTree(docId, title)
    }

    if (!treeId) return

    await loadTree(treeId)

    const question = `请解释以下内容："${selectedText.slice(0, 200)}${selectedText.length > 200 ? '...' : ''}"`
    const nodeId = await addNode(treeId, null, question, selectedText, currentDocument?.chapters[currentChapterIdx]?.content.slice(0, 2000) || '')

    await loadTree(treeId)

    if (nodeId) {
      selectNode(nodeId)
      setShowAIPanel(true)
      setStreaming(nodeId)

      const cleanupToken = window.electronAPI.on('ai:streamToken', (token: unknown) => {
        appendStreamToken(token as string)
      })

      const cleanupDone = window.electronAPI.on('ai:streamDone', (content: unknown) => {
        if (typeof content === 'string') finishStreaming(nodeId, content)
        cleanupToken()
        cleanupDone()
      })

      const cleanupError = window.electronAPI.on('ai:streamError', (error: unknown) => {
        finishStreaming(nodeId, `错误: ${error}`)
        cleanupToken()
        cleanupDone()
        cleanupError()
      })

      await window.electronAPI.invoke('ai:chatStream', [
        {
          role: 'system',
          content: '你是一个帮助理解文档内容的AI助手。请基于提供的文档上下文回答问题。如果上下文不充分，可以结合你的知识进行解释，但需说明哪些是你的推断。'
        },
        { role: 'user', content: question }
      ])
    }
  }

  if (!currentDocument) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }

  const chapter = currentDocument.chapters[currentChapterIdx]

  const readerBgClass = cn(
    'flex flex-col flex-1 min-w-0',
    theme === 'dark' && 'bg-gray-900 text-gray-100',
    theme === 'sepia' && 'bg-amber-50 text-amber-950',
    theme === 'light' && 'bg-white text-foreground'
  )

  return (
    <div className="flex h-full">
      {/* Reading area */}
      <div className={readerBgClass}>
        {/* Toolbar */}
        <div className="sticky top-0 z-20 glass-panel bg-background/70">
          <div className="flex items-center gap-3 px-6 py-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              title="返回书架"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <span className="font-medium text-sm flex-1 truncate">
              {currentDocument.title}
            </span>

            {currentDocument.file_type === 'pdf' && (
              <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('text')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    viewMode === 'text' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  文本
                </button>
                <button
                  onClick={() => setViewMode('pdf')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    viewMode === 'pdf' ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  原版
                </button>
              </div>
            )}

            <div className="w-px h-5 bg-border mx-1" />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                title="减小字号"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                title="增大字号"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showAIPanel
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary',
              )}
              title="AI 知识树"
            >
              {showAIPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>

          {/* Chapter tabs */}
          {currentDocument.chapters.length > 1 && (
            <div className="flex gap-1 px-6 pb-3 overflow-x-auto">
              {currentDocument.chapters.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentChapterIdx(idx)}
                  className={cn(
                    'whitespace-nowrap text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                    idx === currentChapterIdx
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {ch.chapter_title || `章节 ${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content area */}
        {viewMode === 'pdf' && currentDocument.file_type === 'pdf' ? (
          <div className="flex-1 overflow-hidden">
            <PdfViewer filePath={currentDocument.file_path} />
          </div>
        ) : (
          <div
            ref={contentRef}
            className="flex-1 overflow-auto px-8 py-8"
            onMouseUp={handleTextSelection}
          >
            <div className="max-w-3xl mx-auto reader-content">
              {!chapter ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-lg mb-2">暂无内容</p>
                  <p className="text-sm">
                    {currentDocument.chapters.length === 0
                      ? '文档没有可读取的文本内容（可能是扫描版 PDF）。请点击上方 "原版" 按钮查看 PDF 页面。'
                      : '请从上方选择章节开始阅读'}
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: `${fontSize}px` }}>
                  {chapter.chapter_title && (
                    <h2 className="text-2xl font-semibold tracking-tight text-center mb-8">{chapter.chapter_title}</h2>
                  )}
                  {chapter.content ? (
                    chapter.content.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                      <p key={i} className="mb-5 leading-relaxed">
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="text-center opacity-50">此章节内容为空</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selection bar */}
        {selectedText && (
          <div className="sticky bottom-0 z-20 glass-panel border-t border-border px-6 py-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground truncate flex-1">
              已选中: "{selectedText.slice(0, 80)}{selectedText.length > 80 ? '...' : ''}"
            </span>
            <button
              onClick={handleAskAI}
              className="btn-brand text-xs py-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              AI 提问
            </button>
            <button
              onClick={() => setSelectedText('')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 glass-panel border-t border-border px-6 py-2 text-xs text-muted-foreground">
          章节 {currentChapterIdx + 1}/{currentDocument.chapters.length}
          {currentDocument.total_pages > 0 && ` · 进度 ${Math.round((currentDocument.current_page / currentDocument.total_pages) * 100)}%`}
        </div>
      </div>

      {/* Resizable divider + AI panel */}
      {showAIPanel && (
        <>
          <div
            onMouseDown={onResizeStart}
            className="w-1.5 bg-border hover:bg-primary/30 cursor-col-resize shrink-0 transition-colors active:bg-primary/50"
          />
          <div style={{ width: aiPanelWidth }} className="shrink-0">
            <KnowledgeTreePanel />
          </div>
        </>
      )}
    </div>
  )
}
