import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  importFiles: () => ipcRenderer.invoke('import-files'),
  openInExplorer: (filePath: string) => ipcRenderer.invoke('open-in-explorer', filePath),
  getAppPaths: () => ipcRenderer.invoke('get-app-paths'),
  getSidecarPort: () => ipcRenderer.invoke('get-sidecar-port'),
  getSidecarStatus: () => ipcRenderer.invoke('get-sidecar-status'),

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
