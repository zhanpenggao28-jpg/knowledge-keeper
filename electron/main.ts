import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { SidecarManager } from './sidecar'
import { FileManager } from './file-manager'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
let sidecar: SidecarManager | null = null
let fileManager: FileManager | null = null

async function importDroppedFiles(filePaths: string[]) {
  if (!fileManager || !sidecar || !mainWindow) return
  const port = sidecar.getPort()
  if (!port) return

  try {
    const files = await fileManager.importFiles({ filePaths })
    if (files.length === 0) return

    // Register each file with the backend
    const results = []
    for (const file of files) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: file.title,
            originalName: file.originalName,
            fileType: file.fileType,
            category: file.category,
            filePath: file.filePath,
            fileSize: file.fileSize,
            fileHash: file.fileHash,
            originalPath: file.originalPath
          })
        })
        const data = await response.json()
        results.push(data)

        mainWindow?.webContents.send('import-progress', {
          current: results.length,
          total: files.length,
          item: data
        })
      } catch (err) {
        console.error('Failed to register dropped file:', err)
      }
    }

    // Notify renderer to refresh
    mainWindow?.webContents.send('drop-import-complete', { count: results.length })
  } catch (err) {
    console.error('Drop import failed:', err)
    mainWindow?.webContents.send('drop-import-complete', { count: 0, error: (err as Error).message })
  }
}

const zhMenu = Menu.buildFromTemplate([
  {
    label: '文件',
    submenu: [
      { role: 'quit', label: '退出' }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      { role: 'selectAll', label: '全选' }
    ]
  },
  {
    label: '视图',
    submenu: [
      { role: 'reload', label: '刷新' },
      { role: 'toggleDevTools', label: '开发者工具' },
      { type: 'separator' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { role: 'resetZoom', label: '重置缩放' }
    ]
  },
  {
    label: '帮助',
    submenu: [
      { label: '关于知识管家', click: () => {
        const { dialog } = require('electron')
        dialog.showMessageBox({ title: '关于', message: '知识管家 v0.2.0', detail: '个人知识管理桌面工具' })
      }}
    ]
  }
])

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '知识管家',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Intercept file drops: when user drops a file from OS, Chromium tries to
  // navigate to file:///path. We intercept this and import the file instead.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file:///')) {
      event.preventDefault()
      const filePath = decodeURIComponent(url.replace('file:///', ''))
      // Convert to Windows path format
      const winPath = process.platform === 'win32' ? filePath.replace(/\//g, '\\') : filePath
      importDroppedFiles([winPath])
    }
  })

  // Also intercept dropped files via the 'open-file' event (macOS)
  app.on('open-file', (_event, filePath) => {
    importDroppedFiles([filePath])
  })
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(zhMenu)
  const userDataPath = app.getPath('userData')

  // Check for custom storage path in settings
  let storagePath = path.join(app.getPath('documents'), 'KnowledgeKeeper')
  try {
    const settingsFile = path.join(userDataPath, 'settings.json')
    if (fs.existsSync(settingsFile)) {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
      if (settings.customStoragePath && typeof settings.customStoragePath === 'string') {
        storagePath = settings.customStoragePath
      }
    }
  } catch { /* fall back to default */ }

  fileManager = new FileManager(storagePath, userDataPath)
  sidecar = new SidecarManager(path.join(__dirname, '../python_backend'), storagePath)

  registerIpcHandlers(ipcMain, fileManager, sidecar)

  // Create window FIRST so user sees UI immediately
  createWindow()

  // Start Python backend in background (don't block window creation)
  sidecar.start().then(() => {
    const port = sidecar.getPort()
    console.log('[main] sidecar ready on port', port)
    mainWindow?.webContents.send('sidecar-ready', port)
  }).catch((err) => {
    console.error('[main] sidecar failed to start:', err)
  })

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

app.on('before-quit', async () => {
  if (sidecar) {
    await sidecar.stop()
  }
})
