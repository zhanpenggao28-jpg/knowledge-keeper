import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { SidecarManager } from './sidecar'
import { FileManager } from './file-manager'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
let sidecar: SidecarManager | null = null
let fileManager: FileManager | null = null

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

  await sidecar.start()

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

app.on('before-quit', async () => {
  if (sidecar) {
    await sidecar.stop()
  }
})
