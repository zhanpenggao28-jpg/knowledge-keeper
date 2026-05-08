import { useState } from 'react'
import { Modal, Button, Switch, Input, Space, Tag, Typography, message, Progress } from 'antd'
import {
  FileAddOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useAppStore } from '../../stores/appStore'

const { Text } = Typography

function basename(filePath: string, ext?: string): string {
  const name = filePath.replace(/\\/g, '/').split('/').pop() || filePath
  if (ext && name.endsWith(ext)) return name.slice(0, -ext.length)
  return name
}

function extname(filePath: string): string {
  const name = filePath.replace(/\\/g, '/').split('/').pop() || filePath
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot) : ''
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function ImportDialog({ open, onClose }: Props) {
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [organize, setOrganize] = useState(false)
  const [targetDir, setTargetDir] = useState('')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const loadItems = useAppStore(s => s.loadItems)

  const api = window.electronAPI

  const handleSelectFiles = async () => {
    if (!api) return
    const paths = await api.selectFiles()
    if (paths.length > 0) {
      setFilePaths(prev => [...prev, ...paths.filter(p => !prev.includes(p))])
    }
  }

  const handleSelectDirectory = async () => {
    if (!api) return
    const dir = await api.selectDirectory()
    if (dir) setTargetDir(dir)
  }

  const removeFile = (p: string) => {
    setFilePaths(prev => prev.filter(f => f !== p))
  }

  const handleImport = async () => {
    if (filePaths.length === 0 || !api) return
    setImporting(true)
    setProgress({ current: 0, total: filePaths.length })

    const unsubscribe = api.onImportProgress((p) => {
      setProgress({ current: p.current, total: p.total })
    })

    try {
      await api.importFiles({
        filePaths,
        targetDir: organize ? targetDir : undefined,
        prefix: organize ? prefix : undefined,
        suffix: organize ? suffix : undefined
      })
      message.success(`成功导入 ${filePaths.length} 个文件`)
      loadItems()
      onClose()
      resetForm()
    } catch (err) {
      message.error('导入失败: ' + (err as Error).message)
    } finally {
      unsubscribe()
      setImporting(false)
    }
  }

  const resetForm = () => {
    setFilePaths([])
    setOrganize(false)
    setTargetDir('')
    setPrefix('')
    setSuffix('')
  }

  const getPreviewName = (filePath: string) => {
    const ext = extname(filePath)
    const base = basename(filePath, ext)
    return `${prefix}${base}${suffix}${ext}`
  }

  return (
    <Modal
      title={
        <Space>
          <InboxOutlined style={{ color: '#d4b65f' }} />
          导入文件
        </Space>
      }
      open={open}
      onCancel={() => { onClose(); resetForm() }}
      width={560}
      footer={[
        <Button key="cancel" onClick={() => { onClose(); resetForm() }}>
          取消
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<FileAddOutlined />}
          onClick={handleImport}
          loading={importing}
          disabled={filePaths.length === 0}
        >
          确认导入 ({filePaths.length})
        </Button>
      ]}
    >
      {/* File selection */}
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<FileAddOutlined />}
          onClick={handleSelectFiles}
          disabled={!api}
          block
        >
          选择文件
        </Button>
        {!api && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, textAlign: 'center' }}>
            仅在桌面应用中可用
          </Text>
        )}
      </div>

      {/* Selected files */}
      {filePaths.length > 0 && (
        <div style={{
          maxHeight: 160,
          overflow: 'auto',
          padding: 8,
          background: 'var(--bg-base)',
          borderRadius: 6,
          marginBottom: 16
        }}>
          <Space size={4} wrap>
            {filePaths.map(p => (
              <Tag
                key={p}
                closable
                onClose={() => removeFile(p)}
                closeIcon={<DeleteOutlined style={{ fontSize: 10 }} />}
              >
                {basename(p)}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* Organize toggle */}
      <div style={{
        padding: 12,
        background: 'var(--bg-base)',
        borderRadius: 6,
        marginBottom: 12
      }}>
        <Space>
          <Switch checked={organize} onChange={setOrganize} size="small" />
          <Text>整理文件到指定目录</Text>
        </Space>
      </div>

      {/* Organize options */}
      {organize && (
        <div style={{ paddingLeft: 8 }}>
          {/* Directory picker */}
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              目标目录
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={targetDir}
                onChange={e => setTargetDir(e.target.value)}
                placeholder="选择或输入目录路径"
              />
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleSelectDirectory}
                disabled={!api}
              />
            </Space.Compact>
          </div>

          {/* Prefix / Suffix */}
          <Space style={{ width: '100%' }} size={12}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                文件名前缀
              </Text>
              <Input
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                placeholder="例如: work_"
                style={{ width: 200 }}
              />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                文件名后缀
              </Text>
              <Input
                value={suffix}
                onChange={e => setSuffix(e.target.value)}
                placeholder="例如: _v1"
                style={{ width: 200 }}
              />
            </div>
          </Space>

          {/* Preview */}
          {filePaths.length > 0 && targetDir && (
            <div style={{
              marginTop: 12,
              padding: 8,
              background: '#1a1a1a',
              borderRadius: 6,
              fontSize: 12
            }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                文件预览
              </Text>
              {filePaths.slice(0, 5).map(p => (
                <div key={p} style={{ color: '#999', marginBottom: 2 }}>
                  {getPreviewName(p)}
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    → {targetDir}
                  </Text>
                </div>
              ))}
              {filePaths.length > 5 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  ...还有 {filePaths.length - 5} 个文件
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {importing && progress.total > 0 && (
        <div style={{ marginTop: 12 }}>
          <Progress
            percent={Math.round((progress.current / progress.total) * 100)}
            size="small"
            format={() => `${progress.current}/${progress.total}`}
          />
        </div>
      )}
    </Modal>
  )
}
