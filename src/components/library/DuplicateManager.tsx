import { useState, useEffect } from 'react'
import { Modal, Table, Tag, Typography, Button, Space, Popconfirm, App, Empty } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAppStore } from '../../stores/appStore'
import { getDuplicates, deleteItem } from '../../services/api'
import type { Item } from '../../types'

const { Text } = Typography

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DuplicateGroup {
  hash: string
  count: number
  items: Item[]
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function DuplicateManager({ open, onClose }: Props) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const loadItems = useAppStore(s => s.loadItems)
  const { message } = App.useApp()

  useEffect(() => {
    if (open) {
      setLoading(true)
      getDuplicates()
        .then(data => setGroups(data.groups))
        .catch(() => message.error('获取重复文件失败'))
        .finally(() => setLoading(false))
    }
  }, [open, message])

  const handleDeleteOne = async (item: Item) => {
    try {
      await deleteItem(item.id)
      if (window.electronAPI) {
        window.electronAPI.deleteFile(item.file_path, item.original_path).catch(() => {})
      }
      message.success('已删除')
      setGroups(prev => prev.map(g => ({
        ...g,
        items: g.items.filter(i => i.id !== item.id),
        count: g.count - 1
      })).filter(g => g.count > 1))
      loadItems()
    } catch {
      message.error('删除失败')
    }
  }

  const handleKeepOldest = (group: DuplicateGroup) => {
    const sorted = [...group.items].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    sorted.shift()
    Promise.all(sorted.map(i =>
      deleteItem(i.id).then(() => {
        if (window.electronAPI) window.electronAPI.deleteFile(i.file_path, i.original_path).catch(() => {})
      })
    )).then(() => {
      message.success(`已删除 ${sorted.length} 个副本`)
      setGroups(prev => prev.filter(g => g.hash !== group.hash))
      loadItems()
    }).catch(() => message.error('部分删除失败'))
  }

  const handleKeepNewest = (group: DuplicateGroup) => {
    const sorted = [...group.items].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    sorted.shift()
    Promise.all(sorted.map(i =>
      deleteItem(i.id).then(() => {
        if (window.electronAPI) window.electronAPI.deleteFile(i.file_path, i.original_path).catch(() => {})
      })
    )).then(() => {
      message.success(`已删除 ${sorted.length} 个副本`)
      setGroups(prev => prev.filter(g => g.hash !== group.hash))
      loadItems()
    }).catch(() => message.error('部分删除失败'))
  }

  const columns: ColumnsType<Item> = [
    { title: '文件名', dataIndex: 'original_name', key: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'file_type', key: 'type', width: 80, render: (t: string) => <Tag>{t.toUpperCase()}</Tag> },
    { title: '大小', dataIndex: 'file_size', key: 'size', width: 90, render: (s: number) => <Text type="secondary">{formatSize(s)}</Text> },
    { title: '路径', dataIndex: 'original_path', key: 'path', ellipsis: true, width: 200, render: (p: string) => <Text type="secondary" style={{ fontSize: 11 }}>{p}</Text> },
    { title: '导入时间', dataIndex: 'created_at', key: 'time', width: 140, render: (t: string) => <Text type="secondary">{dayjs(t).format('MM-DD HH:mm')}</Text> },
    {
      title: '操作', key: 'actions', width: 80,
      render: (_: any, record: Item) => (
        <Popconfirm title="确认删除此文件？" onConfirm={() => handleDeleteOne(record)} okText="删除" cancelText="取消">
          <Button size="small" danger>删除</Button>
        </Popconfirm>
      )
    }
  ]

  return (
    <Modal
      title="重复文件检测"
      open={open}
      onCancel={onClose}
      width={840}
      footer={<Button onClick={onClose}>关闭</Button>}
      loading={loading}
    >
      {groups.length === 0 && !loading ? (
        <Empty description="没有发现重复文件" />
      ) : (
        groups.map(group => (
          <div key={group.hash} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text strong>Hash: <code style={{ fontSize: 11 }}>{group.hash.substring(0, 12)}...</code></Text>
              <Tag>{group.count} 个重复</Tag>
              <Space size={4} style={{ marginLeft: 'auto' }}>
                <Button size="small" onClick={() => handleKeepOldest(group)}>保留最旧</Button>
                <Button size="small" onClick={() => handleKeepNewest(group)}>保留最新</Button>
              </Space>
            </div>
            <Table
              dataSource={group.items}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </div>
        ))
      )}
    </Modal>
  )
}
