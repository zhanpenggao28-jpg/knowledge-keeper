import { dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

export interface ImportedFile {
  id: string
  title: string
  originalName: string
  fileType: string
  category: string
  filePath: string
  fileSize: number
  fileHash: string
  originalPath: string | null
}

export interface ImportOptions {
  filePaths: string[]
  targetDir?: string
  prefix?: string
  suffix?: string
}

const FILE_FILTERS = [
  { name: '支持的文件', extensions: ['pdf', 'docx', 'doc', 'txt', 'pptx', 'ppt', 'md', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'mp4', 'mkv', 'avi', 'mov', 'webm'] }
]

export class FileManager {
  private storagePath: string
  private userDataPath: string

  constructor(storagePath: string, userDataPath: string) {
    this.storagePath = storagePath
    this.userDataPath = userDataPath
    fs.mkdirSync(path.join(storagePath, 'files'), { recursive: true })
  }

  getStoragePath(): string {
    return this.storagePath
  }

  getAbsolutePath(relativePath: string): string {
    return path.join(this.storagePath, 'files', relativePath)
  }

  async selectFiles(): Promise<string[]> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: FILE_FILTERS
    })
    if (result.canceled || result.filePaths.length === 0) return []
    return result.filePaths
  }

  async selectDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  }

  async importFiles(options: ImportOptions): Promise<ImportedFile[]> {
    const { filePaths, targetDir, prefix, suffix } = options
    if (filePaths.length === 0) return []

    // Ensure target directory exists if organizing
    if (targetDir) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const imported: ImportedFile[] = []

    for (const sourcePath of filePaths) {
      const file = await this.importSingleFile(sourcePath, { targetDir, prefix, suffix })
      if (file) imported.push(file)
    }

    return imported
  }

  private async importSingleFile(
    sourcePath: string,
    organize?: { targetDir: string; prefix?: string; suffix?: string }
  ): Promise<ImportedFile | null> {
    try {
      const stat = fs.statSync(sourcePath)
      const ext = path.extname(sourcePath).toLowerCase().replace('.', '')
      const originalName = path.basename(sourcePath)
      const baseName = path.basename(sourcePath, path.extname(sourcePath))

      const fileBuffer = fs.readFileSync(sourcePath)
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
      const hashDir = hash.substring(0, 16)

      // Copy to internal storage
      const targetDir = path.join(this.storagePath, 'files', hashDir)
      fs.mkdirSync(targetDir, { recursive: true })

      const targetExt = path.extname(sourcePath)
      const targetPath = path.join(targetDir, `original${targetExt}`)
      fs.copyFileSync(sourcePath, targetPath)

      // Optionally organize to custom directory (move: copy then delete source)
      let originalPath: string | null = sourcePath
      if (organize?.targetDir) {
        const pfx = organize.prefix || ''
        const sfx = organize.suffix || ''
        const newName = `${pfx}${baseName}${sfx}${targetExt}`
        const destPath = path.join(organize.targetDir, newName)
        fs.copyFileSync(sourcePath, destPath)
        fs.unlinkSync(sourcePath)
        originalPath = destPath
      }

      return {
        id: '',
        title: baseName,
        originalName,
        fileType: ext,
        category: this.categorize(ext),
        filePath: `${hashDir}/original${targetExt}`,
        fileSize: stat.size,
        fileHash: hash,
        originalPath
      }
    } catch (err) {
      console.error(`Failed to import ${sourcePath}:`, err)
      return null
    }
  }

  private categorize(ext: string): string {
    const docTypes = ['pdf', 'docx', 'doc', 'txt', 'pptx', 'ppt', 'md']
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp']
    const videoTypes = ['mp4', 'mkv', 'avi', 'mov', 'webm']

    if (docTypes.includes(ext)) return 'document'
    if (imageTypes.includes(ext)) return 'image'
    if (videoTypes.includes(ext)) return 'video'
    return 'other'
  }

  resolveWorkingPath(originalPath: string | null | undefined, relativePath: string): string {
    if (originalPath) {
      try {
        if (fs.existsSync(originalPath)) return originalPath
      } catch { /* permission error, fall through */ }
    }
    return this.getAbsolutePath(relativePath)
  }

  openInExplorer(relativePath: string, originalPath?: string | null): void {
    const fullPath = this.resolveWorkingPath(originalPath, relativePath)
    shell.showItemInFolder(fullPath)
  }

  copyFiles(entries: Array<{ relativePath: string; originalPath?: string | null }>, destDir: string): { copied: number; failed: number } {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    let copied = 0; let failed = 0
    for (const entry of entries) {
      const src = this.resolveWorkingPath(entry.originalPath, entry.relativePath)
      if (!fs.existsSync(src)) { failed++; continue }
      const dest = path.join(destDir, path.basename(src))
      try {
        // If destination exists, add a suffix
        let finalDest = dest
        let counter = 1
        while (fs.existsSync(finalDest)) {
          const ext = path.extname(dest)
          const base = path.basename(dest, ext)
          finalDest = path.join(destDir, `${base} (${counter})${ext}`)
          counter++
        }
        fs.copyFileSync(src, finalDest)
        copied++
      } catch { failed++ }
    }
    return { copied, failed }
  }

  renameFile(relativePath: string, originalPath: string | null | undefined, newName: string): { success: boolean; newPath?: string; newOriginalName?: string } {
    const absPath = this.resolveWorkingPath(originalPath, relativePath)
    const dir = path.dirname(absPath)
    const newPath = path.join(dir, newName)

    // Don't overwrite existing files
    if (fs.existsSync(newPath)) {
      return { success: false }
    }

    try {
      fs.renameSync(absPath, newPath)

      // If we renamed the original file, update original_path
      const workingIsOriginal = originalPath && absPath === originalPath
      return {
        success: true,
        newOriginalName: newName,
        newPath: workingIsOriginal ? newPath : undefined
      }
    } catch (err) {
      console.error('Rename failed:', err)
      return { success: false }
    }
  }

  getSettings(): Record<string, unknown> {
    try {
      const file = path.join(this.userDataPath, 'settings.json')
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'))
      }
    } catch { /* ignore */ }
    return {}
  }

  setStoragePath(newPath: string): boolean {
    try {
      const file = path.join(this.userDataPath, 'settings.json')
      const settings = this.getSettings()
      settings['customStoragePath'] = newPath
      fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf-8')
      return true
    } catch (err) {
      console.error('Failed to save settings:', err)
      return false
    }
  }

  moveFile(relativePath: string, originalPath: string | null, destDir: string): { success: boolean; newPath?: string; destName?: string } {
    const sourcePath = this.resolveWorkingPath(originalPath, relativePath)
    if (!fs.existsSync(sourcePath)) return { success: false }
    const fileName = path.basename(sourcePath)
    let destPath = path.join(destDir, fileName)
    let counter = 1
    const ext = path.extname(fileName)
    const base = path.basename(fileName, ext)
    while (fs.existsSync(destPath)) {
      destPath = path.join(destDir, `${base}(${counter})${ext}`)
      counter++
    }
    try {
      fs.copyFileSync(sourcePath, destPath)
      // Only delete source if it's NOT inside the storage directory (i.e., it's an original file or we're moving within storage)
      // For safety, only delete the source if copy succeeded
      fs.unlinkSync(sourcePath)
      return { success: true, newPath: destPath, destName: path.basename(destPath) }
    } catch { return { success: false } }
  }

  findFileByHash(fileHash: string, searchDir: string): string | null {
    if (!fs.existsSync(searchDir)) return null
    try {
      const entries = fs.readdirSync(searchDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(searchDir, entry.name)
        if (entry.isFile()) {
          try {
            const buf = fs.readFileSync(fullPath)
            const hash = crypto.createHash('sha256').update(buf).digest('hex')
            if (hash === fileHash) return fullPath
          } catch { /* skip unreadable files */ }
        } else if (entry.isDirectory()) {
          const found = this.findFileByHash(fileHash, fullPath)
          if (found) return found
        }
      }
    } catch { /* skip */ }
    return null
  }
}
