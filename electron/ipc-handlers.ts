import { IpcMain, BrowserWindow, app, nativeImage } from 'electron'
import { FileManager } from './file-manager'
import { SidecarManager } from './sidecar'
import path from 'path'
import fs from 'fs'

export function registerIpcHandlers(
  ipcMain: IpcMain,
  fileManager: FileManager,
  sidecar: SidecarManager
) {
  ipcMain.handle('select-files', async () => {
    return fileManager.selectFiles()
  })

  ipcMain.handle('select-directory', async () => {
    return fileManager.selectDirectory()
  })

  ipcMain.handle('import-files', async (_event, options: { filePaths: string[]; targetDir?: string; prefix?: string; suffix?: string }) => {
    const files = await fileManager.importFiles(options)
    if (files.length === 0) return []

    const port = sidecar.getPort()
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

  ipcMain.handle('open-in-explorer', (_event, relativePath: string, originalPath?: string | null) => {
    fileManager.openInExplorer(relativePath, originalPath)
  })

  ipcMain.handle('rename-file', (_event, relativePath: string, originalPath: string | null | undefined, newName: string) => {
    return fileManager.renameFile(relativePath, originalPath, newName)
  })

  ipcMain.handle('copy-files', (_event, entries: Array<{ relativePath: string; originalPath?: string | null }>, destDir: string) => {
    return fileManager.copyFiles(entries, destDir)
  })

  ipcMain.handle('get-app-paths', () => ({
    userData: app.getPath('userData'),
    storagePath: fileManager.getStoragePath()
  }))

  ipcMain.handle('drag-file', async (event, relativePath: string, originalPath?: string | null) => {
    const absPath = fileManager.resolveWorkingPath(originalPath, relativePath)
    console.log('[drag-ipc] relativePath:', relativePath, 'originalPath:', originalPath, 'resolved:', absPath, 'exists:', require('fs').existsSync(absPath))
    try {
      const ext = path.extname(absPath).toLowerCase()
      const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
      let icon: Electron.NativeImage
      if (imgExts.includes(ext)) {
        const img = nativeImage.createFromPath(absPath)
        const size = img.getSize()
        const maxDim = 64
        if (size.width > maxDim || size.height > maxDim) {
          const ratio = Math.min(maxDim / size.width, maxDim / size.height)
          icon = img.resize({ width: Math.round(size.width * ratio), height: Math.round(size.height * ratio) })
        } else {
          icon = img
        }
      } else {
        icon = await app.getFileIcon(absPath, { size: 'normal' })
      }
      console.log('[drag-ipc] calling startDrag...')
      const t0 = Date.now()
      event.sender.startDrag({ file: absPath, icon })
      console.log('[drag-ipc] startDrag returned after', Date.now() - t0, 'ms')
      return true
    } catch (err: any) {
      console.error('[drag-ipc] startDrag failed:', err.message, err.stack)
      return false
    }
  })

  ipcMain.handle('drag-files', async (event, entries: Array<{ relativePath: string; originalPath?: string | null }>) => {
    const absPaths = entries.map(e => fileManager.resolveWorkingPath(e.originalPath, e.relativePath)).filter(p => require('fs').existsSync(p))
    if (absPaths.length === 0) return false
    console.log('[drag-ipc] batch drag', absPaths.length, 'files')
    try {
      const firstExt = path.extname(absPaths[0]).toLowerCase()
      const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
      let icon = imgExts.includes(firstExt) ? nativeImage.createFromPath(absPaths[0]) : await app.getFileIcon(absPaths[0], { size: 'normal' })
      if (imgExts.includes(firstExt)) {
        const size = icon.getSize()
        const maxDim = 64
        if (size.width > maxDim || size.height > maxDim) {
          const ratio = Math.min(maxDim / size.width, maxDim / size.height)
          icon = icon.resize({ width: Math.round(size.width * ratio), height: Math.round(size.height * ratio) })
        }
      }
      event.sender.startDrag({ files: absPaths, icon })
      console.log('[drag-ipc] batch startDrag OK')
      return true
    } catch (err: any) {
      console.error('[drag-ipc] batch startDrag failed:', err.message)
      return false
    }
  })

  ipcMain.handle('get-sidecar-port', () => sidecar.getPort())
  ipcMain.handle('get-sidecar-status', () => sidecar.getStatus())

  ipcMain.handle('get-settings', () => fileManager.getSettings())

  ipcMain.handle('set-storage-path', async (_event, newPath: string) => {
    const ok = fileManager.setStoragePath(newPath)
    return { ok }
  })

  ipcMain.handle('find-file-by-hash', async (_event, fileHash: string, searchDir: string) => {
    return fileManager.findFileByHash(fileHash, searchDir)
  })

  ipcMain.handle('relocate-file', async (_event, itemId: string, originalPath: string) => {
    const port = sidecar.getPort()
    try {
      const response = await fetch(`http://127.0.0.1:${port}/items/${itemId}/relocate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_path: originalPath })
      })
      return await response.json()
    } catch (err) {
      console.error('Failed to relocate file:', err)
      return { ok: false }
    }
  })

  ipcMain.handle('sync-file-names', async () => {
    const port = sidecar.getPort()
    let nameUpdated = 0
    let contentUpdated = 0
    const crypto = require('crypto')
    try {
      const response = await fetch(`http://127.0.0.1:${port}/items?limit=200`)
      const data = await response.json() as { items: any[] }
      console.log('[sync] got', data.items.length, 'items from API')
      for (const item of data.items) {
        if (!item.original_path) continue
        try {
          let currentPath: string = item.original_path
          let exists = fs.existsSync(currentPath)

          // If original_path is gone, search by hash in parent dir
          if (!exists && item.file_hash) {
            const parentDir = path.dirname(currentPath)
            if (fs.existsSync(parentDir)) {
              const entries = fs.readdirSync(parentDir)
              for (const entry of entries) {
                const candidate = path.join(parentDir, entry)
                if (!fs.statSync(candidate).isFile()) continue
                try {
                  const buf = fs.readFileSync(candidate)
                  const hash = crypto.createHash('sha256').update(buf).digest('hex')
                  if (hash === item.file_hash) {
                    currentPath = candidate
                    exists = true
                    break
                  }
                } catch { /* skip unreadable */ }
              }
            }
          }

          if (!exists) continue

          // 1. Sync name/path changes
          const currentName = path.basename(currentPath)
          if (currentName !== item.original_name || currentPath !== item.original_path) {
            const ext = path.extname(currentName)
            const baseName = ext ? currentName.slice(0, -ext.length) : currentName
            console.log('[sync] name update:', item.original_name, '->', currentName)
            await fetch(`http://127.0.0.1:${port}/items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: baseName, originalName: currentName })
            })
            if (currentPath !== item.original_path) {
              await fetch(`http://127.0.0.1:${port}/items/${item.id}/relocate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_path: currentPath })
              })
            }
            nameUpdated++
          }

          // 2. Check for content changes via hash comparison
          const currentBuf = fs.readFileSync(currentPath)
          const currentHash = crypto.createHash('sha256').update(currentBuf).digest('hex')
          if (currentHash !== item.file_hash) {
            console.log('[sync] content changed:', currentName)
            const ext = path.extname(currentPath).toLowerCase()
            // For simple text files, extract text directly and update
            if (ext === '.txt' || ext === '.md') {
              let text: string
              try {
                text = currentBuf.toString('utf-8')
              } catch {
                text = currentBuf.toString('gbk')
              }
              await fetch(`http://127.0.0.1:${port}/items/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ extractedText: text, fileHash: currentHash })
              })
              console.log('[sync] text updated directly for', currentName)
              contentUpdated++
            } else {
              // For complex files (pdf, docx, etc.), queue reprocessing
              await fetch(`http://127.0.0.1:${port}/items/${item.id}/reprocess`, {
                method: 'POST'
              })
              console.log('[sync] reprocess queued for', currentName)
              contentUpdated++
            }
          }
        } catch { /* skip inaccessible files */ }
      }
    } catch (err) {
      console.error('[sync] failed:', err)
    }
    console.log('[sync] done, name:', nameUpdated, 'content:', contentUpdated)
    return { updated: nameUpdated + contentUpdated, nameUpdated, contentUpdated }
  })
}
