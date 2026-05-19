import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, Plus, Trash2, ChevronRight, Circle, CheckCircle2, HelpCircle } from 'lucide-react'
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

export function KnowledgeView() {
  const navigate = useNavigate()
  const {
    allTrees, currentTree, selectedNodeId, streamingNodeId, streamingContent,
    fetchAllTrees, loadTree, deleteTree, createTree,
    selectNode, findNodeInTree,
  } = useKnowledgeTreeStore()

  const [showNewInput, setShowNewInput] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    fetchAllTrees()
  }, [fetchAllTrees])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    const treeId = await createTree(null, newTitle.trim())
    setNewTitle('')
    setShowNewInput(false)
    await fetchAllTrees()
    loadTree(treeId)
  }

  const handleDelete = async (e: React.MouseEvent, treeId: number) => {
    e.stopPropagation()
    await deleteTree(treeId)
    await fetchAllTrees()
  }

  const selectedNode = selectedNodeId ? findNodeInTree(selectedNodeId) : null

  return (
    <div className="flex h-full">
      {/* Left: Tree list */}
      <div className="w-64 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h1 className="text-lg font-semibold tracking-tight">知识树</h1>
          <p className="text-xs text-muted-foreground mt-0.5">跨文档的知识探索脉络</p>
        </div>

        <div className="p-3">
          <button
            onClick={() => setShowNewInput(!showNewInput)}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            新建知识树
          </button>
          {showNewInput && (
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="知识树标题..."
                className="flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto px-2 pb-2 space-y-0.5">
          {allTrees.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              暂无知识树
            </p>
          ) : (
            allTrees.map(tree => (
              <div
                key={tree.id}
                onClick={() => loadTree(tree.id)}
                className={cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors',
                  currentTree?.id === tree.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-secondary',
                )}
              >
                <div className="truncate flex-1 min-w-0">
                  <span className="truncate block">{tree.title}</span>
                  {tree.document_title && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {tree.document_title}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(e, tree.id)}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 shrink-0 ml-2 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Tree detail or empty state */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {!currentTree ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <GitBranch className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight mb-2">选择一个知识树</h3>
            <p className="text-sm leading-relaxed max-w-md text-center">
              从左侧选择一个已有的知识树查看探索脉络，或创建新的知识树开始你的 AI 辅助学习之旅。
            </p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Node list sidebar */}
            <div className="w-56 shrink-0 border-r border-border overflow-auto py-2 bg-surface">
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

            {/* Node detail */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!selectedNode ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-6 text-center">
                  <div>
                    <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-base">选择一个节点查看详情</p>
                    <p className="text-sm mt-1 opacity-60">
                      {currentTree.document_id
                        ? '在阅读器中选中文本并点击 AI 提问来创建节点'
                        : '点击左侧知识树中的节点查看问答详情'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Question header */}
                  <div className="p-5 border-b border-border">
                    <h3 className="text-sm font-semibold leading-relaxed">
                      <span className="text-primary font-bold">Q:</span> {selectedNode.question}
                    </h3>
                    {selectedNode.selected_text && (
                      <div className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg p-2.5">
                        关联文本: "{selectedNode.selected_text.slice(0, 200)}{selectedNode.selected_text.length > 200 ? '...' : ''}"
                      </div>
                    )}
                  </div>

                  {/* Answer */}
                  <div className="flex-1 overflow-auto p-5">
                    {selectedNode.id === streamingNodeId ? (
                      <div className="markdown-content text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent || '思考中...'}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle ml-0.5 rounded-sm" />
                      </div>
                    ) : selectedNode.answer ? (
                      <div className="markdown-content text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedNode.answer}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">等待 AI 回答...</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
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
        <TreeNodeItem
          key={node.id}
          node={node}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          level={level}
        />
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
            {expanded ? <ChevronRight className="h-3.5 w-3.5 rotate-90" /> : <ChevronRight className="h-3.5 w-3.5" />}
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
