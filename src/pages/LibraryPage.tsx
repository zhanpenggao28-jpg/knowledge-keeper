import { useState, useEffect } from 'react'
import { Typography, Space, App, Button, Modal, Input } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useItems } from '../hooks/useItems'
import { deleteItem, reprocessItem, updateItem } from '../services/api'
import TypeFilter from '../components/library/TypeFilter'
import ItemGrid from '../components/library/ItemGrid'
import ItemList from '../components/library/ItemList'
import BatchToolbar from '../components/library/BatchToolbar'
import TagManager from '../components/tags/TagManager'
import type { Item } from '../types'

const { Title } = Typography

export default function LibraryPage() {
  const { items, total, isLoading, refresh } = useItems()
  const { viewMode, selectItem, setPreviewOpen, selectedIds, clearSelection } = useAppStore()
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [renameItem, setRenameItem] = useState<Item | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const { message } = App.useApp()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection()
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        useAppStore.getState().selectAll(items.map(i => i.id))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items, clearSelection])

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id)
      message.success('已删除')
      refresh()
    } catch {
      message.error('删除失败')
    }
  }

  const handleReprocess = async (id: string) => {
    try {
      await reprocessItem(id)
      message.success('已加入处理队列')
    } catch {
      message.error('操作失败')
    }
  }

  const handleEditTags = (item: Item) => {
    setEditingItem(item)
    setTagManagerOpen(true)
  }

  const handleRename = (item: Item) => {
    setRenameItem(item)
    setRenameValue(item.original_name)
  }

  const handleRenameConfirm = async () => {
    if (!renameItem || !renameValue.trim() || renameValue === renameItem.original_name) {
      setRenameItem(null); return
    }
    setRenaming(true)
    try {
      const result = await window.electronAPI!.renameFile(
        renameItem.file_path,
        renameItem.original_path,
        renameValue
      )
      if (!result.success) {
        message.error('重命名失败（可能同名文件已存在）')
        return
      }
      const ext = renameValue.includes('.') ? renameValue.substring(renameValue.lastIndexOf('.') + 1) : renameItem.file_type
      const baseName = renameValue.includes('.') ? renameValue.substring(0, renameValue.lastIndexOf('.')) : renameValue
      await updateItem(renameItem.id, { title: baseName, originalName: renameValue })
      if (result.newPath) {
        await window.electronAPI!.relocateFile(renameItem.id, result.newPath)
      }
      message.success('已重命名')
      refresh()
      setRenameItem(null)
    } catch {
      message.error('重命名失败')
    } finally {
      setRenaming(false)
    }
  }

  const handleSelectTag = async (tag: { id: number }) => {
    if (editingItem) {
      const currentTags = editingItem.tags?.map(t => t.id) ?? []
      const newTags = currentTags.includes(tag.id)
        ? currentTags.filter(id => id !== tag.id)
        : [...currentTags, tag.id]
      try {
        await updateItem(editingItem.id, { tag_ids: newTags })
        message.success('标签已更新')
        refresh()
        setTagManagerOpen(false)
        setEditingItem(null)
      } catch {
        message.error('更新失败')
      }
    }
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>文件库</Title>
          <TypeFilter />
        </Space>
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={async () => {
              if (window.electronAPI) {
                const result = await window.electronAPI.syncFileNames()
                const parts: string[] = []
                if (result.nameUpdated > 0) parts.push(`${result.nameUpdated} 个文件名`)
                if (result.contentUpdated > 0) parts.push(`${result.contentUpdated} 个内容已更新`)
                if (parts.length > 0) message.info(parts.join('，'))
              }
              refresh()
            }}
          >
            刷新
          </Button>
          <span style={{ color: '#999' }}>共 {total} 个文件</span>
        </Space>
      </div>

      {viewMode === 'grid' ? (
        <ItemGrid
          items={items}
          onItemClick={(item) => { selectItem(item); setPreviewOpen(true) }}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          onEditTags={handleEditTags}
          onRename={handleRename}
        />
      ) : (
        <ItemList
          items={items}
          onItemClick={(item) => { selectItem(item); setPreviewOpen(true) }}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          onEditTags={handleEditTags}
          onRename={handleRename}
        />
      )}

      <TagManager
        open={tagManagerOpen}
        onClose={() => { setTagManagerOpen(false); setEditingItem(null) }}
        onSelectTag={handleSelectTag}
      />

      <BatchToolbar onRefresh={refresh} />

      <Modal
        title="重命名文件"
        open={!!renameItem}
        onOk={handleRenameConfirm}
        onCancel={() => { setRenameItem(null); setRenameValue('') }}
        confirmLoading={renaming}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onPressEnter={handleRenameConfirm}
          style={{ marginTop: 8 }}
        />
        <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
          重命名会同时修改文件夹中的实际文件名
        </div>
      </Modal>
    </div>
  )
}
