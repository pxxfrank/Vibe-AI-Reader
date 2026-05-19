import { create } from 'zustand'
import type { TreeNode } from '@/types/knowledge-tree'

export interface KnowledgeTreeInfo {
  id: number
  document_id: number | null
  title: string
  created_at: string
}

export interface KnowledgeTreeFull extends KnowledgeTreeInfo {
  nodes: TreeNode[]
}

interface KnowledgeTreeState {
  trees: KnowledgeTreeInfo[]
  currentTree: KnowledgeTreeFull | null
  selectedNodeId: number | null
  streamingNodeId: number | null
  streamingContent: string
  loading: boolean

  fetchTrees: (documentId: number) => Promise<void>
  createTree: (documentId: number | null, title: string) => Promise<number>
  renameTree: (treeId: number, title: string) => Promise<void>
  loadTree: (treeId: number) => Promise<void>
  deleteTree: (treeId: number) => Promise<void>
  selectNode: (nodeId: number | null) => void
  addNode: (treeId: number, parentId: number | null, question: string, selectedText: string, contextSnapshot: string) => Promise<number>
  updateNodeAnswer: (nodeId: number, answer: string, status: string) => Promise<void>
  updateNodeStatus: (nodeId: number, status: string) => Promise<void>
  deleteNode: (nodeId: number) => Promise<void>
  exportMarkdown: (treeId: number) => Promise<string>
  setStreaming: (nodeId: number | null) => void
  appendStreamToken: (token: string) => void
  finishStreaming: (nodeId: number, finalContent: string) => void
  findNodeInTree: (nodeId: number) => TreeNode | null
  askFollowUp: (parentNodeId: number, question: string, selectedText: string) => Promise<void>
}

let streamCleanup: (() => void) | null = null

export const useKnowledgeTreeStore = create<KnowledgeTreeState>((set, get) => ({
  trees: [],
  currentTree: null,
  selectedNodeId: null,
  streamingNodeId: null,
  streamingContent: '',
  loading: false,

  fetchTrees: async (documentId) => {
    const trees = await window.electronAPI.invoke('tree:listByDocument', documentId) as KnowledgeTreeInfo[]
    set({ trees })
  },

  createTree: async (documentId, title) => {
    const treeId = await window.electronAPI.invoke('tree:create', documentId, title) as number
    await get().fetchTrees(documentId!)
    return treeId
  },

  loadTree: async (treeId) => {
    set({ loading: true })
    const tree = await window.electronAPI.invoke('tree:get', treeId) as KnowledgeTreeFull | null
    set({ currentTree: tree, loading: false, selectedNodeId: null })
  },

  deleteTree: async (treeId) => {
    await window.electronAPI.invoke('tree:delete', treeId)
    if (get().currentTree?.id === treeId) {
      set({ currentTree: null, selectedNodeId: null })
    }
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId })
  },

  addNode: async (treeId, parentId, question, selectedText, contextSnapshot) => {
    const nodeId = await window.electronAPI.invoke(
      'tree:addNode', treeId, parentId, question, selectedText, contextSnapshot
    ) as number
    await get().loadTree(treeId)
    return nodeId
  },

  updateNodeAnswer: async (nodeId, answer, status) => {
    await window.electronAPI.invoke('tree:updateNodeAnswer', nodeId, answer, status)
  },

  updateNodeStatus: async (nodeId, status) => {
    await window.electronAPI.invoke('tree:updateNodeStatus', nodeId, status)
    await get().loadTree(get().currentTree!.id)
  },

  deleteNode: async (nodeId) => {
    await window.electronAPI.invoke('tree:deleteNode', nodeId)
    await get().loadTree(get().currentTree!.id)
    set({ selectedNodeId: null })
  },

  exportMarkdown: async (treeId) => {
    return await window.electronAPI.invoke('tree:exportMarkdown', treeId) as string
  },

  setStreaming: (nodeId) => {
    set({ streamingNodeId: nodeId, streamingContent: '' })
  },

  appendStreamToken: (token) => {
    set(s => ({ streamingContent: s.streamingContent + token }))
  },

  finishStreaming: async (nodeId, finalContent) => {
    set(s => {
      const tree = s.currentTree
      if (!tree) return s
      const updateNodeInList = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map(n => ({
          ...n,
          answer: n.id === nodeId ? finalContent : n.answer,
          status: n.id === nodeId ? 'answered' : n.status,
          children: n.children ? updateNodeInList(n.children) : undefined
        }))
      return {
        currentTree: { ...tree, nodes: updateNodeInList(tree.nodes) },
        streamingNodeId: null,
        streamingContent: ''
      }
    })
    await get().updateNodeAnswer(nodeId, finalContent, 'answered')
  },

  findNodeInTree: (nodeId) => {
    const tree = get().currentTree
    if (!tree) return null
    const find = (nodes: TreeNode[]): TreeNode | null => {
      for (const n of nodes) {
        if (n.id === nodeId) return n
        if (n.children) {
          const found = find(n.children)
          if (found) return found
        }
      }
      return null
    }
    return find(tree.nodes)
  },

  renameTree: async (treeId, title) => {
    await window.electronAPI.invoke('tree:rename', treeId, title)
    const docId = get().currentTree?.document_id
    if (docId) await get().fetchTrees(docId)
    if (get().currentTree?.id === treeId) {
      set(s => s.currentTree ? { currentTree: { ...s.currentTree, title } } : {})
    }
  },

  askFollowUp: async (parentNodeId, question, selectedText) => {
    const tree = get().currentTree
    if (!tree) return

    // Clean up previous stream listeners
    if (streamCleanup) {
      streamCleanup()
      streamCleanup = null
    }

    const parentNode = get().findNodeInTree(parentNodeId)
    const contextSnapshot = parentNode
      ? `父问题: ${parentNode.question}\n父回答: ${parentNode.answer?.slice(0, 1000) || ''}`
      : ''
    const fullQuestion = selectedText
      ? `关于你之前回答中的"${selectedText.slice(0, 200)}"，我想追问：${question}`
      : question

    const nodeId = await get().addNode(tree.id, parentNodeId, fullQuestion, selectedText, contextSnapshot)
    get().selectNode(nodeId)
    get().setStreaming(nodeId)

    // Set up streaming listeners
    const cleanupToken = window.electronAPI.on('ai:streamToken', (token: unknown) => {
      get().appendStreamToken(token as string)
    })

    const cleanupDone = window.electronAPI.on('ai:streamDone', (content: unknown) => {
      if (typeof content === 'string') {
        get().finishStreaming(nodeId, content)
      }
      cleanupToken()
      cleanupDone()
      cleanupError()
      streamCleanup = null
    })

    const cleanupError = window.electronAPI.on('ai:streamError', (error: unknown) => {
      get().finishStreaming(nodeId, `错误: ${error}`)
      cleanupToken()
      cleanupDone()
      cleanupError()
      streamCleanup = null
    })

    streamCleanup = () => {
      cleanupToken()
      cleanupDone()
      cleanupError()
    }

    // Collect ancestor context
    const ancestors: { question: string; answer: string }[] = []
    let currentId: number | null = parentNodeId
    let count = 0
    while (currentId && count < 10) {
      const node = get().findNodeInTree(currentId)
      if (!node) break
      ancestors.unshift({ question: node.question, answer: node.answer })
      currentId = node.parent_id
      count++
    }

    const contextChain = ancestors
      .map(a => `Q: ${a.question}\nA: ${a.answer?.slice(0, 500) || '(等待回答)'}`)
      .join('\n\n')

    // Call AI
    window.electronAPI.invoke('ai:chatStream', [
      {
        role: 'system',
        content: `你是一个帮助用户深入理解概念的AI助手。以下是用户从最初问题到现在的完整探索脉络，请基于此上下文回答用户最新的追问。如果某个概念在之前的回答中已经解释过，你可以引用而不要重复。

探索脉络:
${contextChain}

请用简洁清晰的中文回答用户的最新问题。如果涉及新概念，简要解释它们。`
      },
      {
        role: 'user',
        content: fullQuestion
      }
    ])
  }
}))
