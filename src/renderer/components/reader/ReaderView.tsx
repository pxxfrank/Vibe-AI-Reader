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

  // Auto-switch to PDF view for documents with no text content
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

  // Resizable divider logic
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

  // Handle text selection for AI questions
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim())
    }
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
    theme === 'light' && 'bg-white text-gray-900'
  )

  return (
    <div className="flex h-full">
      {/* Reading area */}
      <div className={readerBgClass}>
        {/* Toolbar - sticky so content scrolls behind, making blur visible */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2 border-b border-white/20 bg-background/40 backdrop-blur-xl shadow-sm">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-brand-light/50 transition-colors"
            title="返回书架"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <span className="font-medium text-sm flex-1 truncate">
            {currentDocument.title}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
              className="p-1.5 rounded hover:bg-muted/50 transition-colors"
              title="减小字号"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs w-8 text-center">{fontSize}</span>
            <button
              onClick={() => setFontSize(Math.min(28, fontSize + 2))}
              className="p-1.5 rounded hover:bg-muted/50 transition-colors"
              title="增大字号"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {currentDocument.file_type === 'pdf' && (
            <button
              onClick={() => setViewMode(viewMode === 'text' ? 'pdf' : 'text')}
              className={cn(
                'p-2 rounded-full transition-all duration-200 text-xs flex items-center gap-1',
                viewMode === 'pdf' ? 'bg-brand-light text-brand font-medium' : 'hover:bg-muted/50'
              )}
              title={viewMode === 'text' ? '切换到PDF原版视图' : '切换到文本视图'}
            >
              {viewMode === 'text' ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </button>
          )}

          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={cn(
              'p-2 rounded-full transition-all duration-200',
              showAIPanel
                ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-[0_2px_10px_rgba(102,126,234,0.4)]'
                : 'hover:bg-brand-light/50 text-muted-foreground'
            )}
            title="AI 知识树"
          >
            {showAIPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>

        {/* Chapter navigation */}
        {currentDocument.chapters.length > 1 && (
          <div className="sticky top-[41px] z-10 flex items-center gap-2 px-4 py-1.5 border-b border-white/10 bg-background/40 backdrop-blur-xl overflow-x-auto shadow-sm">
            {currentDocument.chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentChapterIdx(idx)}
                className={cn(
                  'whitespace-nowrap text-xs px-2.5 py-1 rounded transition-colors',
                  idx === currentChapterIdx
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                {ch.chapter_title || `章节 ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Content area */}
        {viewMode === 'pdf' && currentDocument.file_type === 'pdf' ? (
          <div className="flex-1 overflow-hidden">
            <PdfViewer filePath={currentDocument.file_path} />
          </div>
        ) : (
          <div
            ref={contentRef}
            className="flex-1 overflow-auto px-8 py-6"
            onMouseUp={handleTextSelection}
          >
            <div className="max-w-3xl mx-auto">
              {!chapter ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-lg mb-2">暂无内容</p>
                  <p className="text-sm">
                    {currentDocument.chapters.length === 0
                      ? '文档没有可读取的文本内容（可能是扫描版 PDF）。请点击上方 <原版> 按钮查看 PDF 页面。'
                      : '请从上方选择章节开始阅读'}
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: `${fontSize}px` }}>
                  {chapter.chapter_title && (
                    <h2 className="text-xl font-bold text-center mb-6">{chapter.chapter_title}</h2>
                  )}
                  {chapter.content ? (
                    chapter.content.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                      <p key={i} className="mb-4 text-justify leading-relaxed">
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
          <div className="sticky bottom-0 z-20 px-4 py-2 border-t border-white/20 flex items-center gap-3 bg-background/40 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
            <span className="text-xs text-muted-foreground truncate flex-1">
              已选中: "{selectedText.slice(0, 80)}{selectedText.length > 80 ? '...' : ''}"
            </span>
            <button
              onClick={handleAskAI}
              className="btn-brand inline-flex items-center gap-1.5 text-xs px-4 py-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              AI 提问
            </button>
            <button
              onClick={() => setSelectedText('')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
          </div>
        )}

        {/* Footer progress */}
        <div className="sticky bottom-0 px-4 py-1.5 border-t border-white/10 text-xs text-muted-foreground bg-background/40 backdrop-blur-xl">
          章节 {currentChapterIdx + 1}/{currentDocument.chapters.length}
        </div>
      </div>

      {/* Resizable divider + AI panel */}
      {showAIPanel && (
        <>
          {/* Drag handle */}
          <div
            onMouseDown={onResizeStart}
            className="w-1.5 bg-border hover:bg-primary/30 cursor-col-resize flex-shrink-0 transition-colors active:bg-primary/50"
          />
          <div style={{ width: aiPanelWidth }} className="flex-shrink-0">
            <KnowledgeTreePanel />
          </div>
        </>
      )}
    </div>
  )
}
