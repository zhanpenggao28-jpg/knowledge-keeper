import { useState } from 'react'
import { Button, Space, Typography, App } from 'antd'
import { DeleteOutlined, ExportOutlined, CloseOutlined, SelectOutlined, TagsOutlined } from '@ant-design/icons'
import { useAppStore } from '../../stores/appStore'
import { deleteItem, updateItem } from '../../services/api'
import TagManager from '../tags/TagManager'

const { Text } = Typography

interface Props {
  onRefresh: () => void
}

export default function BatchToolbar({ onRefresh }: Props) {
  const { selectedIds, clearSelection, selectAll, items } = useAppStore()
  const { message, modal } = App.useApp()
  const [tagOpen, setTagOpen] = useState(false)

  const count = selectedIds.size
  if (count === 0) return null

  const handleDelete = () => {
    modal.confirm({
      title: `确认删除 ${count} 个文件？`,
      content: '此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const ids = Array.from(selectedIds)
        let done = 0
        for (const id of ids) {
          try { await deleteItem(id); done++ } catch { /* skip */ }
        }
        message.success(`已删除 ${done} 个文件`)
        clearSelection()
        onRefresh()
      }
    })
  }

  const handleExport = async () => {
    if (!window.electronAPI) return
    const dir = await window.electronAPI.selectDirectory()
    if (!dir) return
    const ids = Array.from(selectedIds)
    const selected = items.filter(i => ids.includes(i.id))
    const entries = selected.map(i => ({ relativePath: i.file_path, originalPath: i.original_path }))
    const result = await window.electronAPI.copyFiles(entries, dir)
    if (result.failed > 0) {
      message.warning(`已复制 ${result.copied} 个，${result.failed} 个失败`)
    } else {
      message.success(`已导出 ${result.copied} 个文件`)
    }
    clearSelection()
  }

  const handleSelectAll = () => {
    selectAll(items.map(i => i.id))
  }

  const handleBatchTag = async (tag: { id: number }) => {
    const ids = Array.from(selectedIds)
    const selected = items.filter(i => ids.includes(i.id))
    let done = 0
    for (const item of selected) {
      const currentIds = item.tags?.map(t => t.id) ?? []
      const newIds = currentIds.includes(tag.id)
        ? currentIds.filter(id => id !== tag.id)
        : [...currentIds, tag.id]
      try { await updateItem(item.id, { tag_ids: newIds }); done++ } catch { /* skip */ }
    }
    message.success(`已更新 ${done} 个文件`)
    onRefresh()
  }

  // Compute which tags are common to ALL selected items
  const selectedItems = items.filter(i => selectedIds.has(i.id))
  const commonTagIds = selectedItems.length > 0
    ? selectedItems[0].tags?.map(t => t.id).filter(tid =>
        selectedItems.every(si => si.tags?.some(st => st.id === tid))
      ) ?? []
    : []

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: '#2a2218',
        border: '1px solid #826f42',
        borderRadius: 12,
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
      }}>
        <Text style={{ color: '#d4b65f', fontWeight: 600 }}>
          已选 {count} 项
        </Text>

        <Space>
          <Button size="small" icon={<SelectOutlined />} onClick={handleSelectAll}>
            全选
          </Button>
          <Button size="small" icon={<TagsOutlined />} onClick={() => setTagOpen(true)}>
            标签
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除
          </Button>
          <Button
            size="small"
            icon={<ExportOutlined />}
            onClick={handleExport}
            disabled={!window.electronAPI}
          >
            导出
          </Button>
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={clearSelection}
          >
            取消
          </Button>
        </Space>
      </div>

      <TagManager
        open={tagOpen}
        onClose={() => setTagOpen(false)}
        onSelectTag={handleBatchTag}
        selectedTagIds={commonTagIds}
      />
    </>
  )
}
