export interface TreeNode {
  id: number
  tree_id: number
  parent_id: number | null
  question: string
  answer: string
  selected_text: string
  context_snapshot: string
  status: 'pending' | 'answered' | 'resolved'
  created_at: string
  resolved_at: string | null
  children?: TreeNode[]
}

export interface KnowledgeTreeInfo {
  id: number
  document_id: number | null
  title: string
  created_at: string
}

export interface KnowledgeTreeFull extends KnowledgeTreeInfo {
  nodes: TreeNode[]
}
