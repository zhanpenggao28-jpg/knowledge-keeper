import { useState, useEffect, useCallback, useRef } from 'react'
import { Typography, Space, App, Button, Modal, Input } from 'antd'
import type { InputRef } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useItems } from '../hooks/useItems'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { deleteItem, reprocessItem, updateItem } from '../services/api'
import TypeFilter from '../components/library/TypeFilter'
import ItemGrid from '../components/library/ItemGrid'
import ItemList from '../components/library/ItemList'
import BatchToolbar from '../components/library/BatchToolbar'
import TagBar from '../components/library/TagBar'
import TagManager from '../components/tags/TagManager'
import ImportDialog from '../components/library/ImportDialog'
import ShortcutHelp from '../components/library/ShortcutHelp'
import type { Item } from '../types'

const { Title } = Typography

export default function LibraryPage() {
  const { items, total, isLoading, refresh } = useItems()
  const viewMode = useAppStore(s => s.viewMode)
  const selectedIds = useAppStore(s => s.selectedIds)
  const selectItem = useAppStore(s => s.selectItem)
  const setPreviewOpen = useAppStore(s => s.setPreviewOpen)
  const clearSelection = useAppStore(s => s.clearSelection)
  const selectAll = useAppStore(s => s.selectAll)
  const setActiveSearchQuery = useAppStore(s => s.setActiveSearchQuery)
  const loadItems = useAppStore(s => s.loadItems)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingTagIds, setEditingTagIds] = useState<number[]>([])
  const [renameItem, setRenameItem] = useState<Item | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const { message } = App.useApp()
  const [searchInput, setSearchInput] = useState('')
  const searchInputRef = useRef<InputRef>(null)

  useEffect(() => {
    useAppStore.getState().loadCollections()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearchQuery(searchInput.trim())
      loadItems()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      message.success('已删除')
      refresh()
    } catch {
      message.error('删除失败')
    }
  }, [message, refresh])

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    let done = 0
    for (const id of ids) {
      try { await deleteItem(id); done++ } catch { /* skip */ }
    }
    message.success(`已删除 ${done} 个文件`)
    clearSelection()
    refresh()
  }, [selectedIds, message, clearSelection, refresh])

  const handleReprocess = useCallback(async (id: string) => {
    try {
      await reprocessItem(id)
      message.success('已加入处理队列')
    } catch {
      message.error('操作失败')
    }
  }, [message])

  const handleEditTags = useCallback((item: Item) => {
    setEditingItemId(item.id)
    setEditingTagIds(item.tags?.map(t => t.id) ?? [])
    setTagManagerOpen(true)
  }, [])

  const handleRename = useCallback((item: Item) => {
    setRenameItem(item)
    setRenameValue(item.original_name)
  }, [])

  const handleRenameConfirm = async () => {
    if (!renameItem || !renameValue.trim() || renameValue === renameItem.original_name) {
      setRenameItem(null); return
    }
    setRenaming(true)
    try {
      const result = await window.electronAPI!.renameFile(
        renameItem.file_path, renameItem.original_path, renameValue
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

  const handleRenameSubmit = useCallback(async (item: Item, newName: string): Promise<boolean> => {
    if (!window.electronAPI) {
      message.error('仅在桌面应用中可用')
      return false
    }
    try {
      const result = await window.electronAPI.renameFile(item.file_path, item.original_path, newName)
      if (!result.success) {
        message.error('重命名失败（可能同名文件已存在）')
        return false
      }
      const ext = newName.includes('.') ? newName.substring(newName.lastIndexOf('.') + 1) : item.file_type
      const baseName = newName.includes('.') ? newName.substring(0, newName.lastIndexOf('.')) : newName
      await updateItem(item.id, { title: baseName, originalName: newName })
      if (result.newPath) {
        await window.electronAPI.relocateFile(item.id, result.newPath)
      }
      message.success('已重命名')
      refresh()
      return true
    } catch {
      message.error('重命名失败')
      return false
    }
  }, [message, refresh])

  const handleExportSelected = useCallback(async () => {
    if (!window.electronAPI || selectedIds.size === 0) return
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
  }, [selectedIds, items, message, clearSelection])

  const handlePreview = useCallback(() => {
    if (selectedIds.size !== 1) return
    const id = Array.from(selectedIds)[0]
    const item = items.find(i => i.id === id)
    if (item) {
      selectItem(item)
      setPreviewOpen(true)
    }
  }, [selectedIds, items, selectItem, setPreviewOpen])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    items,
    selectedIds,
    searchInputRef,
    onClearSelection: clearSelection,
    onSelectAll: selectAll,
    onDeleteSelected: handleDeleteSelected,
    onRenameFirst: () => {
      if (selectedIds.size === 1) {
        const id = Array.from(selectedIds)[0]
        const item = items.find(i => i.id === id)
        if (item) handleRename(item)
      }
    },
    onExportSelected: handleExportSelected,
    onPreview: handlePreview,
    onOpenShortcutHelp: () => setHelpOpen(true),
    onOpenImport: () => setImportOpen(true),
  })

  const handleItemClick = useCallback((item: Item) => {
    selectItem(item)
    setPreviewOpen(true)
  }, [selectItem, setPreviewOpen])

  const handleSelectTag = async (tag: { id: number }) => {
    if (!editingItemId) return
    const newIds = editingTagIds.includes(tag.id)
      ? editingTagIds.filter(id => id !== tag.id)
      : [...editingTagIds, tag.id]
    setEditingTagIds(newIds)
    try {
      await updateItem(editingItemId, { tag_ids: newIds })
      useAppStore.getState().bumpTagRefresh()
      message.success('标签已更新')
      refresh()
    } catch {
      message.error('更新失败')
    }
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>文件库</Title>
          <TypeFilter />
          <Input
            ref={searchInputRef}
            prefix={<SearchOutlined />}
            placeholder="输入文字筛选..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            allowClear
            size="small"
            style={{ width: 220 }}
          />
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
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>共 {total} 个文件</span>
        </Space>
      </div>

      <TagBar />

      {viewMode === 'grid' ? (
        <ItemGrid
          items={items}
          onItemClick={handleItemClick}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          onEditTags={handleEditTags}
          onRename={handleRename}
          onRenameSubmit={handleRenameSubmit}
        />
      ) : (
        <ItemList
          items={items}
          onItemClick={handleItemClick}
          onDelete={handleDelete}
          onReprocess={handleReprocess}
          onEditTags={handleEditTags}
          onRename={handleRename}
          onRenameSubmit={handleRenameSubmit}
        />
      )}

      <TagManager
        open={tagManagerOpen}
        onClose={() => { setTagManagerOpen(false); setEditingItemId(null) }}
        onSelectTag={handleSelectTag}
        selectedTagIds={editingTagIds}
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
        <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
          重命名会同时修改文件夹中的实际文件名
        </div>
      </Modal>

      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
