import { ipcMain, dialog } from 'electron'
import { getDatabase, saveDatabase, execRaw, queryAll, queryOne } from '../services/database'
import { parseTxt } from '../services/parser/txt-parser'
import { parsePdf } from '../services/parser/pdf-parser'
import { statSync, readFileSync } from 'fs'

export interface DocumentInfo {
  id: number
  title: string
  author: string
  file_path: string
  file_type: string
  file_size: number
  total_pages: number
  current_page: number
  added_at: string
  last_read_at: string | null
}

export function registerDocumentHandlers(): void {
  ipcMain.handle('documents:import', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: '支持的文件格式', extensions: ['txt', 'pdf'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: 'PDF文件', extensions: ['pdf'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, reason: 'cancelled' }
    }

    const filePath = result.filePaths[0]
    const ext = filePath.split('.').pop()?.toLowerCase()
    const stats = statSync(filePath)

    const db = await getDatabase()
    let parseResult

    try {
      if (ext === 'txt') {
        parseResult = parseTxt(filePath)
      } else if (ext === 'pdf') {
        parseResult = await parsePdf(filePath)
      } else {
        return { success: false, reason: 'unsupported_format' }
      }
    } catch (err) {
      return { success: false, reason: 'parse_error', error: String(err) }
    }

    const { title, author, chapters } = parseResult
    const totalPages = Math.max(1, chapters.length)

    // Validate content
    const totalChars = chapters.reduce((sum, ch) => sum + ch.content.length, 0)
    console.log(`[documents:import] title="${title}", chapters=${chapters.length}, totalChars=${totalChars}`)
    if (totalChars === 0) {
      return { success: false, reason: 'empty_content', error: '文档内容为空，可能是无法解析的PDF（如扫描版图片PDF）' }
    }

    db.run(
      `INSERT INTO documents (title, author, file_path, file_type, file_size, total_pages)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, author, filePath, ext!, stats.size, totalPages]
    )

    const row = db.exec('SELECT last_insert_rowid()')
    const docId = row[0]?.values[0]?.[0] as number ?? 0

    for (const ch of chapters) {
      db.run(
        `INSERT INTO document_content (document_id, chapter_index, chapter_title, content)
         VALUES (?, ?, ?, ?)`,
        [docId, ch.index, ch.title, ch.content]
      )
    }

    console.log(`[documents:import] saved docId=${docId}, chapters stored=${chapters.length}`)
    saveDatabase()

    return { success: true, documentId: docId }
  })

  ipcMain.handle('documents:list', async () => {
    const db = await getDatabase()
    const { values } = execRaw(
      `SELECT id, title, author, file_path, file_type, file_size, total_pages, current_page, added_at, last_read_at
       FROM documents ORDER BY last_read_at DESC, added_at DESC`
    )
    return values.map(row => ({
      id: row[0],
      title: row[1],
      author: row[2],
      file_path: row[3],
      file_type: row[4],
      file_size: row[5],
      total_pages: row[6],
      current_page: row[7],
      added_at: row[8],
      last_read_at: row[9]
    })) as DocumentInfo[]
  })

  ipcMain.handle('documents:get', async (_event, docId: number) => {
    console.log(`[documents:get] fetching docId=${docId}`)
    const doc = queryOne(
      `SELECT id, title, author, file_path, file_type, file_size, total_pages, current_page, added_at, last_read_at
       FROM documents WHERE id = ?`, [docId]
    )
    if (!doc) {
      console.log(`[documents:get] docId=${docId} NOT FOUND`)
      return null
    }

    const chapters = queryAll(
      `SELECT chapter_index, chapter_title, content FROM document_content
       WHERE document_id = ? ORDER BY chapter_index`, [docId]
    )

    console.log(`[documents:get] docId=${docId} found, title="${doc.title}", chapters=${chapters.length}`)
    for (const r of chapters) {
      const ch = r as Record<string, unknown>
      console.log(`  ch[${ch.chapter_index}]: "${ch.chapter_title}" contentLen=${(ch.content as string).length}`)
    }

    return {
      id: doc.id,
      title: doc.title,
      author: doc.author,
      file_path: doc.file_path,
      file_type: doc.file_type,
      file_size: doc.file_size,
      total_pages: doc.total_pages,
      current_page: doc.current_page,
      added_at: doc.added_at,
      last_read_at: doc.last_read_at,
      chapters: chapters.map((r: Record<string, unknown>) => ({
        chapter_index: r.chapter_index,
        chapter_title: r.chapter_title,
        content: r.content
      }))
    }
  })

  ipcMain.handle('documents:delete', async (_event, docId: number) => {
    const db = await getDatabase()
    db.run('DELETE FROM documents WHERE id = ?', [docId])
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('documents:updateProgress', async (_event, docId: number, page: number) => {
    const db = await getDatabase()
    db.run(
      `UPDATE documents SET current_page = ?, last_read_at = datetime('now', 'localtime') WHERE id = ?`,
      [page, docId]
    )
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('documents:readFile', async (_event, filePath: string) => {
    try {
      const buffer = readFileSync(filePath)
      const base64 = buffer.toString('base64')
      console.log(`[documents:readFile] success, size=${buffer.length}, base64Len=${base64.length}`)
      return { success: true, data: base64, size: buffer.length }
    } catch (err) {
      console.error(`[documents:readFile] error:`, err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('documents:getContent', async (_event, docId: number) => {
    const chapters = queryAll(
      `SELECT chapter_index, chapter_title, content FROM document_content
       WHERE document_id = ? ORDER BY chapter_index`, [docId]
    )
    return chapters.map((r: Record<string, unknown>) => ({
      chapter_index: r.chapter_index,
      chapter_title: r.chapter_title,
      content: r.content
    }))
  })
}
