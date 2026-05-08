import { useState } from 'react'
import { Typography, Space, App } from 'antd'
import { useAppStore } from '../stores/appStore'
import { useItems } from '../hooks/useItems'
import { deleteItem, reprocessItem, updateItem } from '../services/api'
import TypeFilter from '../components/library/TypeFilter'
import ItemGrid from '../components/library/ItemGrid'
import ItemList from '../components/library/ItemList'
import TagManager from '../components/tags/TagManager'
import type { Item } from '../types'

const { Title } = Typography

export default function LibraryPage() {
  const { items, total, isLoading, refresh } = useItems()
  const { viewMode, selectItem, setPreviewOpen } = useAppStore()
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const { message } = App.useApp()

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
        <span style={{ color: '#999' }}>共 {total} 个文件</span>
      </div>

      {viewMode === 'grid' ? (
        <ItemGrid
          items={items}
          onItemClick={(item) => { selectItem(item); setPreviewOpen(true) }}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          onEditTags={handleEditTags}
        />
      ) : (
        <ItemList
          items={items}
          onItemClick={(item) => { selectItem(item); setPreviewOpen(true) }}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          onEditTags={handleEditTags}
        />
      )}

      <TagManager
        open={tagManagerOpen}
        onClose={() => { setTagManagerOpen(false); setEditingItem(null) }}
        onSelectTag={handleSelectTag}
      />
    </div>
  )
}
