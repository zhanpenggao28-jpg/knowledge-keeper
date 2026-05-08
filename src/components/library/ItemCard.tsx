import { Card, Tag, Space, Typography, Dropdown } from 'antd'
import {
  FileTextOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons'
import type { Item } from '../../types'
import { getFileURL, getThumbURL } from '../../services/api'
import { useState } from 'react'

const { Text } = Typography

interface Props {
  item: Item
  onClick: () => void
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
  onEditTags: (item: Item) => void
}

function getIcon(category: string, size: number = 32) {
  const style = { fontSize: size, color: '#1677ff' }
  switch (category) {
    case 'document': return <FileTextOutlined style={{ fontSize: size, color: '#1677ff' }} />
    case 'video': return <VideoCameraOutlined style={{ fontSize: size, color: '#52c41a' }} />
    case 'image': return <PictureOutlined style={{ fontSize: size, color: '#fa8c16' }} />
    default: return <FileTextOutlined style={{ fontSize: size, color: '#999' }} />
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const menuItems = (item: Item, onDelete: Props['onDelete'], onReprocess: Props['onReprocess'], onEditTags: Props['onEditTags']) => [
  { key: 'open', icon: <FolderOpenOutlined />, label: '打开位置', onClick: () => window.electronAPI?.openInExplorer(item.file_path) },
  { key: 'tags', icon: <EditOutlined />, label: '编辑标签', onClick: () => onEditTags(item) },
  { key: 'reprocess', icon: <ReloadOutlined />, label: '重新处理', onClick: () => onReprocess(item.id) },
  { type: 'divider' as const },
  { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => onDelete(item.id) }
]

function ThumbContent({ item }: { item: Item }) {
  const [imgError, setImgError] = useState(false)
  const thumbUrl = getThumbURL(item.file_path, item.thumbnail)

  if (thumbUrl && !imgError) {
    return (
      <img
        src={thumbUrl}
        alt=""
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: 120,
          objectFit: 'cover',
          borderRadius: 6,
          background: '#f5f5f5'
        }}
      />
    )
  }

  // For images without thumbnail yet, use the file directly
  if (item.category === 'image' && !imgError) {
    const url = getFileURL(item.file_path)
    return (
      <img
        src={url}
        alt=""
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: 120,
          objectFit: 'cover',
          borderRadius: 6,
          background: '#f5f5f5'
        }}
      />
    )
  }

  // For documents with text, show text snippet
  if (item.category === 'document' && item.extracted_text) {
    return (
      <div style={{
        width: '100%',
        height: 100,
        padding: '6px 8px',
        background: '#fafafa',
        borderRadius: 6,
        overflow: 'hidden',
        fontSize: 11,
        lineHeight: '18px',
        color: '#666',
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
      height: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {getIcon(item.category, 36)}
    </div>
  )
}

export default function ItemCard({ item, onClick, onDelete, onReprocess, onEditTags }: Props) {
  return (
    <Dropdown menu={{ items: menuItems(item, onDelete, onReprocess, onEditTags) }} trigger={['contextMenu']}>
      <Card
        hoverable
        style={{
          borderRadius: 8,
          overflow: 'hidden',
          height: '100%',
          transition: 'all 0.2s'
        }}
        styles={{ body: { padding: 8 } }}
        onClick={onClick}
        cover={<ThumbContent item={item} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Text strong ellipsis style={{ maxWidth: '100%', textAlign: 'center', fontSize: 13 }}>
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
  )
}
