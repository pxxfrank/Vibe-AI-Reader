import { ipcMain } from 'electron'
import { getDatabase, saveDatabase, queryOne, queryAll } from '../services/database'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [key])
    return row ? row.value : null
  })

  ipcMain.handle('settings:getAll', async () => {
    const rows = queryAll('SELECT key, value FROM settings')
    const settings: Record<string, string> = {}
    for (const row of rows) {
      const r = row as Record<string, string>
      settings[r.key] = r.value
    }
    return settings
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    const db = await getDatabase()
    db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
      [key, value, value]
    )
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('settings:setAll', async (_event, settings: Record<string, string>) => {
    const db = await getDatabase()
    for (const [key, value] of Object.entries(settings)) {
      db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, value, value]
      )
    }
    saveDatabase()
    return { success: true }
  })
}
