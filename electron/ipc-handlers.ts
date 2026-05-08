import { IpcMain, BrowserWindow } from 'electron'
import { FileManager } from './file-manager'
import { SidecarManager } from './sidecar'
import { app } from 'electron'
import path from 'path'

export function registerIpcHandlers(
  ipcMain: IpcMain,
  fileManager: FileManager,
  sidecar: SidecarManager
) {
  ipcMain.handle('import-files', async () => {
    const files = await fileManager.importFiles()
    if (files.length === 0) return []

    const port = sidecar.getPort()
    const results = []

    for (const file of files) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(file)
        })
        const data = await response.json()
        results.push(data)

        const win = BrowserWindow.getFocusedWindow()
        if (win) {
          win.webContents.send('import-progress', {
            current: results.length,
            total: files.length,
            item: data
          })
        }
      } catch (err) {
        console.error('Failed to register file:', err)
      }
    }

    return results
  })

  ipcMain.handle('open-in-explorer', (_event, relativePath: string) => {
    fileManager.openInExplorer(relativePath)
  })

  ipcMain.handle('get-app-paths', () => ({
    userData: app.getPath('userData'),
    storagePath: fileManager.getStoragePath()
  }))

  ipcMain.handle('get-sidecar-port', () => sidecar.getPort())
  ipcMain.handle('get-sidecar-status', () => sidecar.getStatus())
}
