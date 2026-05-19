import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

let db: SqlJsDatabase | null = null
let dbPath: string

function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'ai-reader.db')
}

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db

  const SQL = await initSqlJs()
  dbPath = getDbPath()

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode=WAL')
  db.run('PRAGMA foreign_keys=ON')

  createTables(db)
  return db
}

function createTables(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      current_page INTEGER DEFAULT 0,
      added_at TEXT DEFAULT (datetime('now', 'localtime')),
      last_read_at TEXT
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS document_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chapter_index INTEGER NOT NULL,
      chapter_title TEXT DEFAULT '',
      content TEXT NOT NULL
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chapter_index INTEGER DEFAULT 0,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      selected_text TEXT DEFAULT '',
      note TEXT DEFAULT '',
      color TEXT DEFAULT '#FFEB3B',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS knowledge_trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS tree_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL REFERENCES knowledge_trees(id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES tree_nodes(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT DEFAULT '',
      selected_text TEXT DEFAULT '',
      context_snapshot TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      resolved_at TEXT
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
}

export function queryAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: T[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return results
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | null {
  const rows = queryAll<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

export function execRaw(sql: string, params: unknown[] = []): { columns: string[]; values: unknown[][] } {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: unknown[][] = []
  const columns: string[] = []
  while (stmt.step()) {
    const obj = stmt.getAsObject()
    if (columns.length === 0) {
      columns.push(...Object.keys(obj))
    }
    results.push(Object.values(obj))
  }
  stmt.free()
  return { columns, values: results }
}

export function saveDatabase(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}
