import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, ChevronRight, Circle, CheckCircle2, HelpCircle, Trash2, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useKnowledgeTreeStore } from '@/stores/knowledge-tree-store'
import { cn } from '@/lib/utils'
import type { TreeNode } from '@/types/knowledge-tree'

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Circle className="h-3.5 w-3.5 text-red-400" />,
  answered: <HelpCircle className="h-3.5 w-3.5 text-blue-400" />,
  resolved: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
}

export function KnowledgeTreePanel() {
  const { documentId } = useParams<{ documentId: string }>()
  const {
    trees, currentTree, selectedNodeId, streamingNodeId, streamingContent,
    fetchTrees, createTree, renameTree, loadTree, deleteTree, selectNode,
    updateNodeStatus, deleteNode, exportMarkdown, findNodeInTree, askFollowUp
  } = useKnowledgeTreeStore()

  const [newTreeTitle, setNewTreeTitle] = useState('')
  const [showNewTreeInput, setShowNewTreeInput] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [selectedTextForFollowUp, setSelectedTextForFollowUp] = useState('')
  const [renamingTreeId, setRenamingTreeId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (documentId) fetchTrees(Number(documentId))
  }, [documentId, fetchTrees])

  useEffect(() => {
    if (renamingTreeId !== null) renameRef.current?.focus()
  }, [renamingTreeId])

  const selectedNode = selectedNodeId ? findNodeInTree(selectedNodeId) : null

  const handleCreateTree = async () => {
    if (!newTreeTitle.trim() || !documentId) return
    const treeId = await createTree(Number(documentId), newTreeTitle.trim())
    setNewTreeTitle('')
    setShowNewTreeInput(false)
    loadTree(treeId)
  }

  const handleRenameStart = (treeId: number, currentTitle: string) => {
    setRenamingTreeId(treeId)
    setRenameValue(currentTitle)
  }

  const handleRenameSubmit = async () => {
    if (renamingTreeId !== null && renameValue.trim()) {
      await renameTree(renamingTreeId, renameValue.trim())
    }
    setRenamingTreeId(null)
  }

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim() || !selectedNodeId || !currentTree) return
    await askFollowUp(selectedNodeId, followUpQuestion.trim(), selectedTextForFollowUp)
    setFollowUpQuestion('')
    setSelectedTextForFollowUp('')
  }

  const handleExport = async () => {
    if (!currentTree) return
    const md = await exportMarkdown(currentTree.id)
    await navigator.clipboard.writeText(md)
  }

  return (
    <div className="flex h-full border-l border-border">
      {/* Tree sidebar */}
      <div className="w-48 shrink-0 border-r border-border flex flex-col bg-surface">
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">知识探索</span>
            <button
              onClick={() => setShowNewTreeInput(!showNewTreeInput)}
              className="p-1 rounded-md hover:bg-secondary transition-colors"
              title="新建知识树"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {showNewTreeInput && (
            <div className="flex gap-1">
              <input
                type="text"
                value={newTreeTitle}
                onChange={(e) => setNewTreeTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTree()}
                placeholder="知识树标题..."
                className="flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto py-2">
          {trees.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">暂无知识树</p>
          ) : (
            trees.map(tree => (
              <div
                key={tree.id}
                onClick={() => loadTree(tree.id)}
                className={cn(
                  'group flex items-center justify-between rounded-lg mx-2 px-2 py-1.5 text-xs cursor-pointer transition-colors',
                  currentTree?.id === tree.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-secondary',
                )}
              >
                {renamingTreeId === tree.id ? (
                  <input
                    ref={renameRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit()
                      if (e.key === 'Escape') setRenamingTreeId(null)
                    }}
                    onBlur={handleRenameSubmit}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 rounded border bg-background px-1 py-0 text-xs focus:outline-none"
                  />
                ) : (
                  <span
                    className="truncate flex-1"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleRenameStart(tree.id, tree.title)
                    }}
                    title="双击重命名"
                  >
                    {tree.title}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTree(tree.id) }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 shrink-0 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {currentTree && (
          <div className="border-t border-border px-3 py-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
              <Copy className="h-3.5 w-3.5" /> 复制 Markdown
            </button>
          </div>
        )}
      </div>

      {/* Node list sidebar */}
      {currentTree && (
        <div className="w-48 shrink-0 border-r border-border overflow-auto py-2 bg-surface/50">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            探索节点
          </div>
          <TreeNodeList
            nodes={currentTree.nodes}
            selectedNodeId={selectedNodeId}
            onSelect={selectNode}
            level={0}
          />
        </div>
      )}

      {/* Node detail panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {!selectedNode ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-6 text-center">
            <div>
              <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-base">选择一个节点查看详情</p>
              <p className="text-sm mt-1 opacity-60">或在阅读区选中文本后点击 "AI 提问"</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Question header */}
            <div className="p-5 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold leading-relaxed flex-1">
                  <span className="text-primary font-bold">Q:</span> {selectedNode.question}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateNodeStatus(selectedNode.id, 'resolved')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      selectedNode.status === 'resolved'
                        ? 'bg-green-50 text-green-600'
                        : 'text-muted-foreground hover:bg-green-50 hover:text-green-600'
                    )}
                    title="标记为已解决"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="删除节点"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {selectedNode.selected_text && (
                <div className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg p-2.5">
                  关联文本: "{selectedNode.selected_text.slice(0, 200)}{selectedNode.selected_text.length > 200 ? '...' : ''}"
                </div>
              )}
            </div>

            {/* Answer area */}
            <div className="flex-1 overflow-auto p-5">
              {selectedNode.id === streamingNodeId ? (
                <div className="markdown-content text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent || '思考中...'}
                  </ReactMarkdown>
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle ml-0.5 rounded-sm" />
                </div>
              ) : selectedNode.answer ? (
                <div
                  className="markdown-content text-sm"
                  onMouseUp={() => {
                    const sel = window.getSelection()
                    if (sel && sel.toString().trim()) {
                      setSelectedTextForFollowUp(sel.toString().trim())
                    }
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedNode.answer}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <div className="flex gap-1 justify-center mb-2">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-sm">等待 AI 回答...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up input */}
            {selectedNode.status !== 'pending' && (
              <div className="p-4 border-t border-border bg-surface/50">
                {selectedTextForFollowUp && (
                  <div className="text-xs text-muted-foreground mb-2 p-2 bg-surface rounded-lg border">
                    <span className="font-medium">追问引用:</span> "{selectedTextForFollowUp.slice(0, 150)}{selectedTextForFollowUp.length > 150 ? '...' : ''}"
                    <button onClick={() => setSelectedTextForFollowUp('')} className="ml-2 hover:text-foreground font-bold">×</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={followUpQuestion}
                    onChange={(e) => setFollowUpQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleFollowUp()
                      }
                    }}
                    placeholder={selectedTextForFollowUp ? '针对选中内容继续追问...' : '继续追问，深入理解...'}
                    className="flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <button
                    onClick={handleFollowUp}
                    disabled={!followUpQuestion.trim()}
                    className="btn-brand text-sm shrink-0 disabled:opacity-40 disabled:hover:brightness-100"
                  >
                    追问
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TreeNodeList({ nodes, selectedNodeId, onSelect, level }: {
  nodes: TreeNode[]
  selectedNodeId: number | null
  onSelect: (id: number) => void
  level: number
}) {
  return (
    <>
      {nodes.map(node => (
        <TreeNodeItem key={node.id} node={node} selectedNodeId={selectedNodeId} onSelect={onSelect} level={level} />
      ))}
    </>
  )
}

function TreeNodeItem({ node, selectedNodeId, onSelect, level }: {
  node: TreeNode
  selectedNodeId: number | null
  onSelect: (id: number) => void
  level: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex items-center gap-1.5 py-1.5 px-3 cursor-pointer text-xs transition-colors hover:bg-secondary rounded-md mx-1',
          selectedNodeId === node.id && 'bg-primary/10 text-primary font-medium',
          selectedNodeId !== node.id && 'text-foreground',
        )}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }} className="p-0.5 shrink-0">
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-5" />
        )}
        {statusIcons[node.status]}
        <span className="truncate flex-1">{node.question.slice(0, 30)}{node.question.length > 30 ? '...' : ''}</span>
      </div>
      {expanded && hasChildren && (
        <TreeNodeList nodes={node.children!} selectedNodeId={selectedNodeId} onSelect={onSelect} level={level + 1} />
      )}
    </div>
  )
}
