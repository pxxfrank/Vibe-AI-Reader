import { ipcMain } from 'electron'
import { getDatabase, saveDatabase, queryAll, queryOne } from '../services/database'

export interface TreeNode {
  id: number
  tree_id: number
  parent_id: number | null
  question: string
  answer: string
  selected_text: string
  context_snapshot: string
  status: string
  created_at: string
  resolved_at: string | null
  children?: TreeNode[]
}

export interface KnowledgeTree {
  id: number
  document_id: number | null
  title: string
  created_at: string
  nodes: TreeNode[]
}

export function registerKnowledgeTreeHandlers(): void {
  ipcMain.handle('tree:create', async (_event, documentId: number | null, title: string) => {
    const db = await getDatabase()
    db.run('INSERT INTO knowledge_trees (document_id, title) VALUES (?, ?)', [documentId, title])
    const row = db.exec('SELECT last_insert_rowid()')
    const treeId = row[0]?.values[0]?.[0] as number
    saveDatabase()
    return treeId
  })

  ipcMain.handle('tree:listByDocument', async (_event, documentId: number) => {
    const rows = queryAll(
      'SELECT id, document_id, title, created_at FROM knowledge_trees WHERE document_id = ? ORDER BY created_at DESC',
      [documentId]
    )
    return rows as Omit<KnowledgeTree, 'nodes'>[]
  })

  ipcMain.handle('tree:get', async (_event, treeId: number) => {
    const treeRow = queryOne(
      'SELECT id, document_id, title, created_at FROM knowledge_trees WHERE id = ?', [treeId]
    )
    if (!treeRow) return null

    const nodeRows = queryAll(
      `SELECT id, tree_id, parent_id, question, answer, selected_text, context_snapshot, status, created_at, resolved_at
       FROM tree_nodes WHERE tree_id = ? ORDER BY created_at`, [treeId]
    )

    const nodes: TreeNode[] = nodeRows.map(row => {
      const r = row as Record<string, unknown>
      return {
        id: r.id as number,
        tree_id: r.tree_id as number,
        parent_id: r.parent_id as number | null,
        question: r.question as string,
        answer: r.answer as string,
        selected_text: r.selected_text as string,
        context_snapshot: r.context_snapshot as string,
        status: r.status as string,
        created_at: r.created_at as string,
        resolved_at: r.resolved_at as string | null
      }
    })

    return {
      id: treeRow.id,
      document_id: treeRow.document_id,
      title: treeRow.title,
      created_at: treeRow.created_at,
      nodes: buildTree(nodes)
    } as KnowledgeTree
  })

  ipcMain.handle('tree:addNode', async (_event, treeId: number, parentId: number | null, question: string, selectedText: string, contextSnapshot: string) => {
    const db = await getDatabase()
    db.run(
      `INSERT INTO tree_nodes (tree_id, parent_id, question, selected_text, context_snapshot, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [treeId, parentId, question, selectedText, contextSnapshot]
    )
    const row = db.exec('SELECT last_insert_rowid()')
    const nodeId = row[0]?.values[0]?.[0] as number
    saveDatabase()
    return nodeId
  })

  ipcMain.handle('tree:updateNodeAnswer', async (_event, nodeId: number, answer: string, status: string) => {
    const db = await getDatabase()
    db.run(
      `UPDATE tree_nodes SET answer = ?, status = ?, resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now', 'localtime') ELSE resolved_at END
       WHERE id = ?`,
      [answer, status, status, nodeId]
    )
    saveDatabase()
  })

  ipcMain.handle('tree:updateNodeStatus', async (_event, nodeId: number, status: string) => {
    const db = await getDatabase()
    db.run(
      `UPDATE tree_nodes SET status = ?, resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now', 'localtime') ELSE resolved_at END
       WHERE id = ?`,
      [status, status, nodeId]
    )
    saveDatabase()
  })

  ipcMain.handle('tree:deleteNode', async (_event, nodeId: number) => {
    const db = await getDatabase()
    deleteSubtree(db, nodeId)
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('tree:getAncestors', async (_event, nodeId: number) => {
    const ancestors: { id: number; question: string; answer: string }[] = []
    let currentId: number | null = nodeId

    while (currentId) {
      const row = queryOne(
        'SELECT id, parent_id, question, answer FROM tree_nodes WHERE id = ?', [currentId]
      ) as Record<string, unknown> | null
      if (!row) break
      ancestors.unshift({
        id: row.id as number,
        question: row.question as string,
        answer: row.answer as string
      })
      currentId = row.parent_id as number | null
    }

    return ancestors
  })

  ipcMain.handle('tree:rename', async (_event, treeId: number, title: string) => {
    const db = await getDatabase()
    db.run('UPDATE knowledge_trees SET title = ? WHERE id = ?', [title, treeId])
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('tree:delete', async (_event, treeId: number) => {
    const db = await getDatabase()
    db.run('DELETE FROM knowledge_trees WHERE id = ?', [treeId])
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('tree:exportMarkdown', async (_event, treeId: number) => {
    const tree = await getFullTree(treeId)
    if (!tree) return ''
    return formatTreeAsMarkdown(tree)
  })
}

function buildTree(nodes: TreeNode[]): TreeNode[] {
  const map = new Map<number, TreeNode>()
  const roots: TreeNode[] = []

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] })
  }

  for (const node of map.values()) {
    if (node.parent_id !== null && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children!.push(node)
    } else if (node.parent_id === null) {
      roots.push(node)
    }
  }

  return roots
}

function deleteSubtree(db: ReturnType<typeof getDatabase> extends Promise<infer T> ? T : never, nodeId: number): void {
  const rows = queryAll('SELECT id FROM tree_nodes WHERE parent_id = ?', [nodeId])
  for (const row of rows) {
    const r = row as Record<string, unknown>
    deleteSubtree(db, r.id as number)
  }
  db.run('DELETE FROM tree_nodes WHERE id = ?', [nodeId])
}

async function getFullTree(treeId: number): Promise<KnowledgeTree | null> {
  const treeRow = queryOne(
    'SELECT id, document_id, title, created_at FROM knowledge_trees WHERE id = ?', [treeId]
  )
  if (!treeRow) return null

  const nodeRows = queryAll(
    `SELECT id, tree_id, parent_id, question, answer, selected_text, context_snapshot, status, created_at, resolved_at
     FROM tree_nodes WHERE tree_id = ? ORDER BY created_at`, [treeId]
  )

  const nodes: TreeNode[] = nodeRows.map(row => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as number, tree_id: r.tree_id as number, parent_id: r.parent_id as number | null,
      question: r.question as string, answer: r.answer as string, selected_text: r.selected_text as string,
      context_snapshot: r.context_snapshot as string, status: r.status as string,
      created_at: r.created_at as string, resolved_at: r.resolved_at as string | null
    }
  })

  return {
    id: treeRow.id as number, document_id: treeRow.document_id as number | null,
    title: treeRow.title as string, created_at: treeRow.created_at as string,
    nodes: buildTree(nodes)
  }
}

function formatTreeAsMarkdown(tree: KnowledgeTree): string {
  let md = `# ${tree.title}\n\n`
  function renderNode(node: TreeNode, depth: number): string {
    const indent = '  '.repeat(depth)
    const statusIcon = node.status === 'resolved' ? '✅' : node.status === 'answered' ? '🔵' : '🔴'
    let result = `${indent}- ${statusIcon} **Q: ${node.question}**\n`
    if (node.answer) {
      result += `${indent}  A: ${node.answer.slice(0, 200)}${node.answer.length > 200 ? '...' : ''}\n`
    }
    if (node.children) {
      for (const child of node.children) {
        result += renderNode(child, depth + 1)
      }
    }
    return result
  }
  for (const root of tree.nodes) {
    md += renderNode(root, 0)
  }
  return md
}
