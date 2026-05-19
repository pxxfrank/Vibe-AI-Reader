import { app, BrowserWindow, shell, protocol } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { registerIpcHandlers } from './ipc'
import { getDatabase, closeDatabase } from '../services/database'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'AI Reader',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Register custom protocol for local file access (PDF viewer)
  protocol.handle('local-file', async (request) => {
    const filePath = decodeURIComponent(request.url.slice('local-file://'.length))
    try {
      const data = await readFile(filePath)
      return new Response(data, {
        headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-cache' }
      })
    } catch (err) {
      console.error('[local-file] failed to read:', filePath, err)
      return new Response('File not found', { status: 404 })
    }
  })

  await getDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  closeDatabase()
})
