import { useState } from 'react'
import { Modal, Radio, Input, InputNumber, Button, Space, Typography, Progress, App } from 'antd'
import type { Item } from '../../types'
import { updateItem } from '../../services/api'

const { Text } = Typography

interface Props {
  open: boolean
  selectedItems: Item[]
  onClose: () => void
  onComplete: () => void
}

type RenameMode = 'prefix' | 'suffix' | 'replace' | 'sequence'

function splitName(name: string): { base: string; ext: string } {
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return { base: name, ext: '' }
  return { base: name.substring(0, idx), ext: name.substring(idx) }
}

function getPreview(originalName: string, index: number, mode: RenameMode, prefix: string, suffix: string, findText: string, replaceText: string, template: string, startNum: number, pad: number): string {
  const { base, ext } = splitName(originalName)
  let newBase: string
  switch (mode) {
    case 'prefix':
      newBase = prefix + base
      break
    case 'suffix':
      newBase = base + suffix
      break
    case 'replace':
      newBase = findText ? base.split(findText).join(replaceText) : base
      break
    case 'sequence':
      newBase = template.split('{n}').join(String(startNum + index).padStart(pad, '0'))
      break
  }
  return newBase + ext
}

export default function BatchRenameDialog({ open, selectedItems, onClose, onComplete }: Props) {
  const { message } = App.useApp()
  const [mode, setMode] = useState<RenameMode>('prefix')
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [template, setTemplate] = useState('file_{n}')
  const [startNum, setStartNum] = useState(1)
  const [pad, setPad] = useState(2)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: 0 })

  const previews = selectedItems.slice(0, 10).map((item, i) => ({
    old: item.original_name,
    new: getPreview(item.original_name, i, mode, prefix, suffix, findText, replaceText, template, startNum, pad)
  }))

  const changedCount = previews.filter(p => p.old !== p.new).length
  const totalChanged = selectedItems.filter((item, i) => {
    const n = getPreview(item.original_name, i, mode, prefix, suffix, findText, replaceText, template, startNum, pad)
    return n !== item.original_name
  }).length

  const canApply = totalChanged > 0 && !processing && !!window.electronAPI

  const handleApply = async () => {
    if (!window.electronAPI) return
    setProcessing(true)
    setProgress({ current: 0, total: selectedItems.length, errors: 0 })
    let errors = 0

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i]
      const newName = getPreview(item.original_name, i, mode, prefix, suffix, findText, replaceText, template, startNum, pad)
      if (newName === item.original_name) {
        setProgress(p => ({ ...p, current: i + 1 }))
        continue
      }
      try {
        const result = await window.electronAPI.renameFile(item.file_path, item.original_path, newName)
        if (!result.success) { errors++; setProgress(p => ({ ...p, current: i + 1, errors })); continue }
        const { base } = splitName(newName)
        await updateItem(item.id, { title: base, originalName: newName })
        if (result.newPath) {
          await window.electronAPI.relocateFile(item.id, result.newPath)
        }
      } catch {
        errors++
      }
      setProgress(p => ({ ...p, current: i + 1, errors }))
    }

    setProcessing(false)
    if (errors > 0) {
      message.warning(`重命名完成，${selectedItems.length - errors} 个成功，${errors} 个失败`)
    } else {
      message.success(`已重命名 ${selectedItems.length} 个文件`)
    }
    onComplete()
  }

  const handleClose = () => {
    if (processing) return
    onClose()
  }

  return (
    <Modal
      title="批量重命名"
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose} disabled={processing}>取消</Button>
          <Button type="primary" onClick={handleApply} disabled={!canApply} loading={processing}>
            应用重命名
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>重命名模式</Text>
        <Radio.Group value={mode} onChange={e => setMode(e.target.value)} optionType="button" buttonStyle="solid" size="small">
          <Radio.Button value="prefix">添加前缀</Radio.Button>
          <Radio.Button value="suffix">添加后缀</Radio.Button>
          <Radio.Button value="replace">查找替换</Radio.Button>
          <Radio.Button value="sequence">编号序列</Radio.Button>
        </Radio.Group>
      </div>

      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        {mode === 'prefix' && (
          <Input
            placeholder="例如: work_"
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
          />
        )}
        {mode === 'suffix' && (
          <Input
            placeholder="例如: _v1"
            value={suffix}
            onChange={e => setSuffix(e.target.value)}
          />
        )}
        {mode === 'replace' && (
          <Space>
            <Input placeholder="查找" value={findText} onChange={e => setFindText(e.target.value)} style={{ width: 160 }} />
            <Input placeholder="替换为" value={replaceText} onChange={e => setReplaceText(e.target.value)} style={{ width: 160 }} />
          </Space>
        )}
        {mode === 'sequence' && (
          <Space>
            <Input placeholder="例如: report_{n}" value={template} onChange={e => setTemplate(e.target.value)} style={{ width: 180 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>起始</Text>
            <InputNumber size="small" min={0} value={startNum} onChange={v => setStartNum(v ?? 1)} style={{ width: 60 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>补零</Text>
            <InputNumber size="small" min={1} max={6} value={pad} onChange={v => setPad(v ?? 2)} style={{ width: 50 }} />
          </Space>
        )}
      </Space>

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>预览（前10个）</Text>
        {selectedItems.length > 10 && (
          <Text type="secondary" style={{ fontSize: 12 }}> — 还有 {selectedItems.length - 10} 个文件</Text>
        )}
      </div>

      <div style={{
        maxHeight: 180,
        overflow: 'auto',
        background: 'var(--bg-base)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 12px',
        marginBottom: processing ? 12 : 0
      }}>
        {previews.map((p, i) => (
          <div key={i} style={{ fontSize: 12, lineHeight: '22px', display: 'flex', gap: 8 }}>
            <Text type="secondary" style={{ flexShrink: 0 }}>{p.old}</Text>
            <Text style={{ flexShrink: 0, color: 'var(--text-muted)' }}>→</Text>
            <Text style={{ color: p.old !== p.new ? 'var(--accent)' : 'var(--text-muted)' }}>{p.new}</Text>
          </div>
        ))}
        {changedCount === 0 && mode !== 'sequence' && (
          <Text type="secondary" style={{ fontSize: 12 }}>输入内容后预览改名效果</Text>
        )}
      </div>

      {processing && (
        <Progress
          percent={Math.round((progress.current / progress.total) * 100)}
          format={() => `${progress.current}/${progress.total}`}
          status={progress.errors > 0 ? 'exception' : 'active'}
          style={{ marginBottom: 0 }}
        />
      )}

      {!window.electronAPI && (
        <Text type="danger" style={{ fontSize: 12 }}>仅在桌面应用中可用</Text>
      )}
    </Modal>
  )
}
