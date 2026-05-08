import { Drawer, Typography, Tag, Space, Descriptions, Skeleton } from 'antd'
import type { Item } from '../../types'
import DocPreview from './DocPreview'
import VideoPreview from './VideoPreview'
import ImagePreview from './ImagePreview'
import TextPreview from './TextPreview'
import dayjs from 'dayjs'

const { Title } = Typography

interface Props {
  open: boolean
  item: Item | null
  onClose: () => void
  refreshKey: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PreviewDrawer({ open, item, onClose, refreshKey }: Props) {
  if (!item) {
    return (
      <Drawer open={open} onClose={onClose} width={640} title="预览">
        <Skeleton active />
      </Drawer>
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={640}
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>{item.title || item.original_name}</Title>
          <Tag>{item.file_type.toUpperCase()}</Tag>
          {item.tags?.map(t => (
            <Tag key={t.id} color={t.color}>{t.name}</Tag>
          ))}
        </Space>
      }
    >
      <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="文件名">{item.original_name}</Descriptions.Item>
        <Descriptions.Item label="大小">{formatSize(item.file_size)}</Descriptions.Item>
        <Descriptions.Item label="状态">{item.status}</Descriptions.Item>
        <Descriptions.Item label="导入时间">{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
      </Descriptions>

      {item.category === 'image' && <ImagePreview filePath={item.file_path} preview={item.preview} />}
      {item.category === 'video' && <VideoPreview filePath={item.file_path} thumbnail={item.thumbnail} />}
      {item.category === 'document' && item.file_type === 'pdf' && <DocPreview filePath={item.file_path} preview={item.preview} />}
      {item.category === 'document' && item.file_type !== 'pdf' && <TextPreview itemId={item.id} refreshKey={refreshKey} />}

      {item.summary && (
        <div style={{ marginTop: 16, padding: 12, background: '#2a2218', borderRadius: 8, border: '1px solid #826f42' }}>
          <Title level={5} style={{ color: '#d4b65f' }}>AI 摘要</Title>
          <p>{item.summary}</p>
        </div>
      )}
    </Drawer>
  )
}
