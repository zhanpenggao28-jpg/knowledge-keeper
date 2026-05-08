import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  importFiles: (options: { filePaths: string[]; targetDir?: string; prefix?: string; suffix?: string }) =>
    ipcRenderer.invoke('import-files', options),
  openInExplorer: (filePath: string, originalPath?: string | null) =>
    ipcRenderer.invoke('open-in-explorer', filePath, originalPath),
  getAppPaths: () => ipcRenderer.invoke('get-app-paths'),
  dragFile: (relativePath: string, originalPath?: string | null) =>
    ipcRenderer.invoke('drag-file', relativePath, originalPath),
  getSidecarPort: () => ipcRenderer.invoke('get-sidecar-port'),
  getSidecarStatus: () => ipcRenderer.invoke('get-sidecar-status'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setStoragePath: (path: string) => ipcRenderer.invoke('set-storage-path', path),
  findFileByHash: (fileHash: string, searchDir: string) =>
    ipcRenderer.invoke('find-file-by-hash', fileHash, searchDir),
  relocateFile: (itemId: string, originalPath: string) =>
    ipcRenderer.invoke('relocate-file', itemId, originalPath),
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
  }
})
