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
}

export class FileManager {
  private storagePath: string

  constructor(storagePath: string) {
    this.storagePath = storagePath
    fs.mkdirSync(path.join(storagePath, 'files'), { recursive: true })
  }

  getStoragePath(): string {
    return this.storagePath
  }

  async importFiles(): Promise<ImportedFile[]> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '支持的文件', extensions: ['pdf', 'docx', 'doc', 'txt', 'pptx', 'ppt', 'md', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'mp4', 'mkv', 'avi', 'mov', 'webm'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) return []

    const imported: ImportedFile[] = []

    for (const sourcePath of result.filePaths) {
      const file = await this.importSingleFile(sourcePath)
      if (file) imported.push(file)
    }

    return imported
  }

  private async importSingleFile(sourcePath: string): Promise<ImportedFile | null> {
    try {
      const stat = fs.statSync(sourcePath)
      const ext = path.extname(sourcePath).toLowerCase().replace('.', '')
      const originalName = path.basename(sourcePath)

      const fileBuffer = fs.readFileSync(sourcePath)
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
      const hashDir = hash.substring(0, 16)

      const targetDir = path.join(this.storagePath, 'files', hashDir)
      fs.mkdirSync(targetDir, { recursive: true })

      const targetExt = path.extname(sourcePath)
      const targetPath = path.join(targetDir, `original${targetExt}`)
      fs.copyFileSync(sourcePath, targetPath)

      return {
        id: '',
        title: path.basename(sourcePath, path.extname(sourcePath)),
        originalName,
        fileType: ext,
        category: this.categorize(ext),
        filePath: `${hashDir}/original${targetExt}`,
        fileSize: stat.size,
        fileHash: hash
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

  openInExplorer(relativePath: string): void {
    const fullPath = path.join(this.storagePath, 'files', relativePath)
    shell.showItemInFolder(fullPath)
  }
}
