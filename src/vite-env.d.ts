/// <reference types="vite/client" />

interface ImportProgress {
  current: number
  total: number
  item: { id: string; title: string; status: string }
}

interface ElectronAPI {
  importFiles: () => Promise<any[]>
  openInExplorer: (filePath: string) => Promise<void>
  getAppPaths: () => Promise<{ userData: string; storagePath: string }>
  getSidecarPort: () => Promise<number>
  getSidecarStatus: () => Promise<'starting' | 'running' | 'stopped' | 'error'>
  onSidecarReady: (callback: (port: number) => void) => () => void
  onImportProgress: (callback: (progress: ImportProgress) => void) => () => void
}

export {}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
