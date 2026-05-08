/// <reference types="vite/client" />

interface ImportProgress {
  current: number
  total: number
  item: { id: string; title: string; status: string }
}

interface ImportFileOptions {
  filePaths: string[]
  targetDir?: string
  prefix?: string
  suffix?: string
}

interface ElectronAPI {
  selectFiles: () => Promise<string[]>
  selectDirectory: () => Promise<string | null>
  importFiles: (options: ImportFileOptions) => Promise<any[]>
  dragFile: (relativePath: string, originalPath?: string | null) => void
  openInExplorer: (filePath: string, originalPath?: string | null) => Promise<void>
  getAppPaths: () => Promise<{ userData: string; storagePath: string }>
  getSidecarPort: () => Promise<number>
  getSidecarStatus: () => Promise<'starting' | 'running' | 'stopped' | 'error'>
  getSettings: () => Promise<Record<string, unknown>>
  setStoragePath: (path: string) => Promise<{ ok: boolean }>
  findFileByHash: (fileHash: string, searchDir: string) => Promise<string | null>
  relocateFile: (itemId: string, originalPath: string) => Promise<{ ok: boolean }>
  syncFileNames: () => Promise<{ updated: number; nameUpdated: number; contentUpdated: number }>
  onSidecarReady: (callback: (port: number) => void) => () => void
  onImportProgress: (callback: (progress: ImportProgress) => void) => () => void
}

export {}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
