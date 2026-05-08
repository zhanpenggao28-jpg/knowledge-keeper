import { Table, Tag, Space, Typography, Button, Empty, Checkbox } from 'antd'
import {
  FolderOpenOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  FileTextOutlined, VideoCameraOutlined, PictureOutlined
} from '@ant-design/icons'
import type { Item } from '../../types'
import { getFileURL, getThumbURL } from '../../services/api'
import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import dayjs from 'dayjs'

const { Text } = Typography

interface Props {
  items: Item[]
  onItemClick: (item: Item) => void
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
  onEditTags: (item: Item) => void
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
        style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
    )
  }

  if (item.category === 'image' && !imgError) {
    return (
      <img src={getFileURL(item.file_path)} alt="" draggable={false} onError={() => setImgError(true)}
        style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
    )
  }

  const iconStyle = { fontSize: 20, color: '#d4b65f' }
  switch (item.category) {
    case 'video': return <VideoCameraOutlined style={iconStyle} />
    case 'image': return <PictureOutlined style={iconStyle} />
    default: return <FileTextOutlined style={iconStyle} />
  }
}

export default function ItemList({ items, onItemClick, onDelete, onReprocess, onEditTags }: Props) {
  const { selectedIds, toggleSelect, selectAll, clearSelection } = useAppStore()

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
      width: 180,
      render: (_: any, record: Item) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => onEditTags(record)}>标签</Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => onReprocess(record.id)} />
          <Button size="small" icon={<FolderOpenOutlined />} onClick={() => window.electronAPI?.openInExplorer(record.file_path, record.original_path)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <Table
      dataSource={items}
      columns={columns}
      rowKey="id"
      pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (total) => `共 ${total} 个文件` }}
      size="middle"
      onRow={(record) => ({
        onClick: () => onItemClick(record),
        onMouseDown: (e: React.MouseEvent) => {
          if (e.button !== 0) return
          const target = e.target as HTMLElement
          if (target.closest('.ant-checkbox, .ant-checkbox-wrapper, .ant-btn, .ant-tag, .ant-dropdown')) return

          const startX = e.clientX
          const startY = e.clientY
          let triggered = false

          const onMove = (ev: MouseEvent) => {
            if (triggered) return
            if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 3) {
              triggered = true
              document.removeEventListener('mousemove', onMove)
              document.removeEventListener('mouseup', onUp)
              console.log('[drag-list] trigger on', record.category, record.file_type)
              window.electronAPI?.dragFile(record.file_path, record.original_path)
            }
          }
          const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
          }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        },
        style: { cursor: 'grab', userSelect: 'none' as const }
      })}
    />
  )
}
