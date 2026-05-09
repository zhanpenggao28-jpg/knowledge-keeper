import { Card, Tag, Space, Typography, Dropdown, Checkbox } from 'antd'
import {
  FileTextOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons'
import type { Item } from '../../types'
import { getFileURL, getThumbURL, addItemsToCollection } from '../../services/api'
import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import CollectionManager from './CollectionManager'

const { Text } = Typography

interface Props {
  item: Item
  onClick: () => void
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
  onEditTags: (item: Item) => void
  onRename: (item: Item) => void
}

const ICON_COLOR = 'var(--accent)'

function getIcon(category: string, size: number = 32) {
  switch (category) {
    case 'document': return <FileTextOutlined style={{ fontSize: size, color: ICON_COLOR }} />
    case 'video': return <VideoCameraOutlined style={{ fontSize: size, color: ICON_COLOR }} />
    case 'image': return <PictureOutlined style={{ fontSize: size, color: ICON_COLOR }} />
    default: return <FileTextOutlined style={{ fontSize: size, color: 'var(--text-muted)' }} />
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const menuItems = (item: Item, onDelete: Props['onDelete'], onReprocess: Props['onReprocess'], onEditTags: Props['onEditTags'], onRename: Props['onRename'], opts?: { originalMissing?: boolean; onRelocate?: () => void; onMove?: () => void; collections?: { id: number; name: string; color: string }[]; onAddToCollection?: (collectionId: number) => void; onNewCollection?: () => void }) => {
  const items: any[] = [
    { key: 'open', icon: <FolderOpenOutlined />, label: '打开位置', onClick: () => window.electronAPI?.openInExplorer(item.file_path, item.original_path) },
    { key: 'rename', icon: <EditOutlined />, label: '重命名', onClick: () => onRename(item) },
    { key: 'tags', icon: <EditOutlined />, label: '编辑标签', onClick: () => onEditTags(item) },
    { key: 'reprocess', icon: <ReloadOutlined />, label: '重新处理', onClick: () => onReprocess(item.id) },
  ]
  if (opts?.originalMissing) {
    items.push({ key: 'relocate', icon: <ReloadOutlined />, label: '重新定位', onClick: opts.onRelocate })
  }
  items.push({ key: 'move', icon: <FolderOpenOutlined />, label: '移动到...', onClick: opts?.onMove })
  // Add to collection submenu
  if (opts?.collections) {
    const collChildren: any[] = opts.collections.map(c => ({
      key: `col-${c.id}`,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 3, background: c.color, display: 'inline-block' }} />
          {c.name}
        </span>
      ),
      onClick: () => opts.onAddToCollection?.(c.id)
    }))
    collChildren.push(
      { type: 'divider' as const },
      { key: 'new-collection', icon: <PlusOutlined />, label: '新建收藏集...', onClick: () => opts.onNewCollection?.() }
    )
    items.push({ key: 'add-to-collection', icon: <FolderOpenOutlined />, label: '添加到收藏集', children: collChildren })
  }
  items.push(
    { type: 'divider' as const },
    { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => onDelete(item.id) }
  )
  return items
}

function ThumbContent({ item }: { item: Item }) {
  const [imgError, setImgError] = useState(false)
  const thumbUrl = getThumbURL(item.file_path, item.thumbnail)

  if (thumbUrl && !imgError) {
    return (
      <img
        src={thumbUrl}
        alt=""
        draggable={false}
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: 130,
          objectFit: 'cover',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)'
        }}
      />
    )
  }

  if (item.category === 'image' && !imgError) {
    const url = getFileURL(item.file_path)
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: 130,
          objectFit: 'cover',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)'
        }}
      />
    )
  }

  if (item.category === 'document' && item.extracted_text) {
    return (
      <div style={{
        width: '100%',
        height: 110,
        padding: '8px 10px',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        fontSize: 11,
        lineHeight: '18px',
        color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace'
      }}>
        {item.extracted_text.substring(0, 150)}
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {getIcon(item.category, 40)}
    </div>
  )
}

export default function ItemCard({ item, onClick, onDelete, onReprocess, onEditTags, onRename }: Props) {
  const { selectedIds, toggleSelect } = useAppStore()
  const isSelected = selectedIds.has(item.id)
  const [hovered, setHovered] = useState(false)
  const showCheck = hovered || isSelected
  const refreshKey = useAppStore(s => s.refreshKey)
  const collections = useAppStore(s => s.collections)
  const loadCollections = useAppStore(s => s.loadCollections)
  const [originalMissing, setOriginalMissing] = useState(false)
  const [collOpen, setCollOpen] = useState(false)

  useEffect(() => {
    if (item.original_path && window.electronAPI) {
      window.electronAPI.checkFileExists(item.original_path).then(exists => {
        setOriginalMissing(!exists)
      })
    } else {
      setOriginalMissing(false)
    }
  }, [item.original_path, refreshKey])

  useEffect(() => { loadCollections() }, [])

  const handleRelocate = async () => {
    if (!window.electronAPI || !item.file_hash) return
    const searchDir = item.original_path
      ? item.original_path.substring(0, item.original_path.lastIndexOf('\\') + 1) || item.original_path
      : ''
    const found = await window.electronAPI.findFileByHash(item.file_hash, searchDir)
    if (found) {
      await window.electronAPI.relocateFile(item.id, found)
      setOriginalMissing(false)
    } else {
      alert('未找到匹配文件')
    }
  }

  const handleMove = async () => {
    if (!window.electronAPI) return
    const dir = await window.electronAPI.selectDirectory()
    if (!dir) return
    const result = await window.electronAPI.moveFile(item.file_path, item.original_path, dir)
    if (result.success && result.newPath) {
      await window.electronAPI.relocateFile(item.id, result.newPath)
      useAppStore.getState().loadItems()
    }
  }

  const handleAddToCollection = async (collectionId: number) => {
    await addItemsToCollection(collectionId, [item.id])
    useAppStore.getState().bumpCollectionRefresh()
    loadCollections()
  }


  const handleDragStart = (e: React.DragEvent) => {
    const state = useAppStore.getState()
    const ids = state.selectedIds.has(item.id) && state.selectedIds.size > 1
      ? Array.from(state.selectedIds)
      : [item.id]
    e.dataTransfer.setData('application/x-item-ids', JSON.stringify(ids))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{ height: '100%', cursor: 'grab', userSelect: 'none' }}
    >
    <Dropdown menu={{ items: menuItems(item, onDelete, onReprocess, onEditTags, onRename, { originalMissing, onRelocate: handleRelocate, onMove: handleMove, collections, onAddToCollection: handleAddToCollection, onNewCollection: () => setCollOpen(true) }) }} trigger={['contextMenu']}>
      <Card
        hoverable
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          height: '100%',
          transition: 'all 0.2s ease',
          cursor: 'grab',
          background: isSelected ? 'rgba(200,168,78,0.08)' : 'var(--bg-surface)',
          border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
          transform: hovered ? 'translateY(-2px)' : undefined,
          boxShadow: hovered ? 'var(--shadow-sm)' : undefined
        }}
        styles={{ body: { padding: 10 } }}
        onClick={onClick}
        cover={
          <div style={{ position: 'relative' }}>
            <ThumbContent item={item} />
            {originalMissing && (
              <div
                title="原始文件已移动或删除，当前使用备份"
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#c98a3e',
                  zIndex: 5
                }}
              />
            )}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                opacity: showCheck ? 1 : 0,
                transition: 'opacity 0.15s',
                background: isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.5)',
                borderRadius: 'var(--radius-sm)',
                padding: '1px 3px'
              }}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => toggleSelect(item.id)}
                style={{ transform: 'scale(0.85)' }}
              />
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Text strong ellipsis style={{ maxWidth: '100%', textAlign: 'center', fontSize: 13, color: 'var(--text)' }}>
            {item.title || item.original_name}
          </Text>
          <Space size={4} wrap style={{ justifyContent: 'center' }}>
            <Tag style={{ fontSize: 11, margin: 0 }}>{item.file_type.toUpperCase()}</Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>{formatSize(item.file_size)}</Text>
          </Space>
          {item.tags && item.tags.length > 0 && (
            <Space size={2} wrap style={{ justifyContent: 'center' }}>
              {item.tags.map(t => (
                <Tag key={t.id} color={t.color} style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>{t.name}</Tag>
              ))}
            </Space>
          )}
        </div>
      </Card>
    </Dropdown>
    <CollectionManager open={collOpen} onClose={() => { setCollOpen(false); loadCollections() }} onSelectCollection={(c) => { handleAddToCollection(c.id); setCollOpen(false) }} />
    </div>
  )
}
