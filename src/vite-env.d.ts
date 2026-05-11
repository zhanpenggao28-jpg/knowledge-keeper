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
  getFilePath: (file: File) => string
  selectFiles: () => Promise<string[]>
  selectDirectory: () => Promise<string | null>
  importFiles: (options: ImportFileOptions) => Promise<any[]>
  dragFile: (relativePath: string, originalPath?: string | null) => Promise<boolean>
  dragFiles: (entries: Array<{ relativePath: string; originalPath?: string | null }>) => Promise<boolean>
  openInExplorer: (filePath: string, originalPath?: string | null) => Promise<void>
  renameFile: (relativePath: string, originalPath: string | null | undefined, newName: string) => Promise<{ success: boolean; newPath?: string; newOriginalName?: string }>
  copyFiles: (entries: Array<{ relativePath: string; originalPath?: string | null }>, destDir: string) => Promise<{ copied: number; failed: number }>
  getAppPaths: () => Promise<{ userData: string; storagePath: string }>
  getSidecarPort: () => Promise<number>
  getSidecarStatus: () => Promise<'starting' | 'running' | 'stopped' | 'error'>
  getSettings: () => Promise<Record<string, unknown>>
  setStoragePath: (path: string) => Promise<{ ok: boolean }>
  checkFileExists: (filePath: string) => Promise<boolean>
  findFileByHash: (fileHash: string, searchDir: string) => Promise<string | null>
  relocateFile: (itemId: string, originalPath: string) => Promise<{ ok: boolean }>
  moveFile: (relativePath: string, originalPath: string | null, destDir: string) => Promise<{ success: boolean; newPath?: string; destName?: string }>
  deleteFile: (relativePath: string, originalPath?: string | null) => Promise<void>
  syncFileNames: () => Promise<{ updated: number; nameUpdated: number; contentUpdated: number }>
  onSidecarReady: (callback: (port: number) => void) => () => void
  onImportProgress: (callback: (progress: ImportProgress) => void) => () => void
  onDropImportComplete: (callback: (result: { count: number; error?: string }) => void) => () => void
}

export {}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
