import { Table, Tag, Space, Typography, Button, Empty, Checkbox, Dropdown } from 'antd'
import {
  FolderOpenOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  FileTextOutlined, VideoCameraOutlined, PictureOutlined, PlusOutlined
} from '@ant-design/icons'
import type { Item } from '../../types'
import { getFileURL, getThumbURL, addItemsToCollection } from '../../services/api'
import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import CollectionManager from './CollectionManager'
import dayjs from 'dayjs'

const { Text } = Typography

interface Props {
  items: Item[]
  onItemClick: (item: Item) => void
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
  onEditTags: (item: Item) => void
  onRename: (item: Item) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ThumbIcon({ item }: { item: Item }) {
  const [imgError, setImgError] = useState(false)
  const thumbUrl = getThumbURL(item.file_path, item.thumbnail)

  if (thumbUrl && !imgError) {
    return (
      <img src={thumbUrl} alt="" draggable={false} onError={() => setImgError(true)}
        style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }} />
    )
  }

  if (item.category === 'image' && !imgError) {
    return (
      <img src={getFileURL(item.file_path)} alt="" draggable={false} onError={() => setImgError(true)}
        style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }} />
    )
  }

  const iconStyle = { fontSize: 20, color: 'var(--accent)' }
  switch (item.category) {
    case 'video': return <VideoCameraOutlined style={iconStyle} />
    case 'image': return <PictureOutlined style={iconStyle} />
    default: return <FileTextOutlined style={iconStyle} />
  }
}

function OriginalDot({ item, refreshKey }: { item: Item; refreshKey: number }) {
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (item.original_path && window.electronAPI) {
      window.electronAPI.checkFileExists(item.original_path).then(exists => setMissing(!exists))
    } else {
      setMissing(false)
    }
  }, [item.original_path, refreshKey])
  if (!missing) return null
  return (
    <span
      title="原始文件已移动或删除，当前使用备份"
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#c98a3e',
        marginRight: 4,
        verticalAlign: 'middle'
      }}
    />
  )
}

async function handleRelocateItem(item: Item) {
  if (!window.electronAPI || !item.file_hash) return
  const searchDir = item.original_path
    ? item.original_path.substring(0, item.original_path.lastIndexOf('\\') + 1) || item.original_path
    : ''
  const found = await window.electronAPI.findFileByHash(item.file_hash, searchDir)
  if (found) {
    await window.electronAPI.relocateFile(item.id, found)
  } else {
    alert('未找到匹配文件')
  }
}

async function handleMoveItem(item: Item) {
  if (!window.electronAPI) return
  const dir = await window.electronAPI.selectDirectory()
  if (!dir) return
  const result = await window.electronAPI.moveFile(item.file_path, item.original_path, dir)
  if (result.success && result.newPath) {
    await window.electronAPI.relocateFile(item.id, result.newPath)
    useAppStore.getState().loadItems()
  }
}

export default function ItemList({ items, onItemClick, onDelete, onReprocess, onEditTags, onRename }: Props) {
  const { selectedIds, toggleSelect, selectAll, clearSelection, refreshKey, collections, loadCollections } = useAppStore()
  const [collOpen, setCollOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<Item | null>(null)

  useEffect(() => { loadCollections() }, [])

  const handleAddToCollection = async (item: Item, collectionId: number) => {
    await addItemsToCollection(collectionId, [item.id])
    useAppStore.getState().bumpCollectionRefresh()
    loadCollections()
  }

  if (items.length === 0) {
    return <Empty description="还没有文件" />
  }

  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id))
  const someSelected = items.some(i => selectedIds.has(i.id))

  const columns = [
    {
      title: (
        <Checkbox
          checked={allSelected}
          indeterminate={!allSelected && someSelected}
          onChange={() => allSelected ? clearSelection() : selectAll(items.map(i => i.id))}
        />
      ),
      key: 'select',
      width: 40,
      render: (_: any, record: Item) => (
        <Checkbox
          checked={selectedIds.has(record.id)}
          onChange={() => toggleSelect(record.id)}
          onClick={(e: any) => e.stopPropagation()}
        />
      )
    },
    {
      title: '',
      key: 'thumb',
      width: 60,
      render: (_: any, record: Item) => <ThumbIcon item={record} />
    },
    {
      title: '名称',
      dataIndex: 'title',
      key: 'title',
      render: (_: any, record: Item) => (
        <Space>
          <OriginalDot item={record} refreshKey={refreshKey} />
          <a onClick={() => onItemClick(record)}>
            {record.title || record.original_name}
          </a>
          <Tag>{record.file_type.toUpperCase()}</Tag>
          {record.tags?.map(t => (
            <Tag key={t.id} color={t.color}>{t.name}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (c: string) => <Tag>{c === 'document' ? '文档' : c === 'image' ? '图片' : c === 'video' ? '视频' : '其他'}</Tag>
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (s: number) => <Text type="secondary">{formatSize(s)}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => {
        const map: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '待处理' },
          processing: { color: 'processing', text: '处理中' },
          done: { color: 'success', text: '已完成' },
          error: { color: 'error', text: '错误' }
        }
        const info = map[s] ?? { color: 'default', text: s }
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (t: string) => <Text type="secondary">{dayjs(t).format('YYYY-MM-DD HH:mm')}</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: 210,
      render: (_: any, record: Item) => (
        <Space size="small">
          <Button size="small" onClick={() => onRename(record)}>重命名</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEditTags(record)}>标签</Button>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                ...collections.map(c => ({
                  key: `col-${c.id}`,
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 3, background: c.color, display: 'inline-block' }} />
                      {c.name}
                    </span>
                  ),
                  onClick: () => handleAddToCollection(record, c.id)
                })),
                { type: 'divider' as const },
                { key: 'new', icon: <PlusOutlined />, label: '新建收藏集...', onClick: () => { setActiveItem(record); setCollOpen(true) } }
              ]
            }}
          >
            <Button size="small">收藏集</Button>
          </Dropdown>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => onReprocess(record.id)} />
          <Button size="small" icon={<FolderOpenOutlined />} onClick={() => window.electronAPI?.openInExplorer(record.file_path, record.original_path)} />
          <Button size="small" onClick={() => handleMoveItem(record)}>移动到</Button>
          {record.original_path && record.file_hash && (
            <Button size="small" icon={<ReloadOutlined />} title="重新定位原始文件" onClick={() => handleRelocateItem(record)} />
          )}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <>
    <Table
      dataSource={items}
      columns={columns}
      rowKey="id"
      pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (total) => `共 ${total} 个文件` }}
      size="middle"
      onRow={(record) => ({
        onClick: () => onItemClick(record),
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          const state = useAppStore.getState()
          const ids = state.selectedIds.has(record.id) && state.selectedIds.size > 1
            ? Array.from(state.selectedIds)
            : [record.id]
          e.dataTransfer.setData('application/x-item-ids', JSON.stringify(ids))
          e.dataTransfer.effectAllowed = 'move'
        },
        style: { cursor: 'grab', userSelect: 'none' as const }
      })}
    />
    <CollectionManager
      open={collOpen}
      onClose={() => { setCollOpen(false); loadCollections() }}
      onSelectCollection={(c) => {
        if (activeItem) handleAddToCollection(activeItem, c.id)
        setCollOpen(false)
      }}
    />
    </>
  )
}
