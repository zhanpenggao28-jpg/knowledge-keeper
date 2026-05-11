import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  importFiles: (options: { filePaths: string[]; targetDir?: string; prefix?: string; suffix?: string }) =>
    ipcRenderer.invoke('import-files', options),
  openInExplorer: (filePath: string, originalPath?: string | null) =>
    ipcRenderer.invoke('open-in-explorer', filePath, originalPath),
  renameFile: (relativePath: string, originalPath: string | null | undefined, newName: string) =>
    ipcRenderer.invoke('rename-file', relativePath, originalPath, newName),
  copyFiles: (entries: Array<{ relativePath: string; originalPath?: string | null }>, destDir: string) =>
    ipcRenderer.invoke('copy-files', entries, destDir),
  getAppPaths: () => ipcRenderer.invoke('get-app-paths'),
  dragFile: (relativePath: string, originalPath?: string | null) =>
    ipcRenderer.invoke('drag-file', relativePath, originalPath),
  dragFiles: (entries: Array<{ relativePath: string; originalPath?: string | null }>) =>
    ipcRenderer.invoke('drag-files', entries),
  getSidecarPort: () => ipcRenderer.invoke('get-sidecar-port'),
  getSidecarStatus: () => ipcRenderer.invoke('get-sidecar-status'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setStoragePath: (path: string) => ipcRenderer.invoke('set-storage-path', path),
  checkFileExists: (filePath: string) =>
    ipcRenderer.invoke('check-file-exists', filePath),
  findFileByHash: (fileHash: string, searchDir: string) =>
    ipcRenderer.invoke('find-file-by-hash', fileHash, searchDir),
  relocateFile: (itemId: string, originalPath: string) =>
    ipcRenderer.invoke('relocate-file', itemId, originalPath),
  moveFile: (relativePath: string, originalPath: string | null, destDir: string) =>
    ipcRenderer.invoke('move-file', relativePath, originalPath, destDir),
  deleteFile: (relativePath: string, originalPath?: string | null) =>
    ipcRenderer.invoke('delete-file', relativePath, originalPath),
  syncFileNames: () => ipcRenderer.invoke('sync-file-names'),

  onSidecarReady: (callback: (port: number) => void) => {
    const handler = (_event: any, port: number) => callback(port)
    ipcRenderer.on('sidecar-ready', handler)
    return () => ipcRenderer.removeListener('sidecar-ready', handler)
  },
  onImportProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('import-progress', handler)
    return () => ipcRenderer.removeListener('import-progress', handler)
  },
  onDropImportComplete: (callback: (result: { count: number; error?: string }) => void) => {
    const handler = (_event: any, result: any) => callback(result)
    ipcRenderer.on('drop-import-complete', handler)
    return () => ipcRenderer.removeListener('drop-import-complete', handler)
  }
})
