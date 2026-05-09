import { useState, useEffect } from 'react'
import { Modal, Input, Button, List, Space, Typography, Popconfirm, Empty, App, ColorPicker } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useAppStore } from '../../stores/appStore'
import * as api from '../../services/api'
import type { Collection } from '../../types'

const { Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
  onSelectCollection?: (collection: Collection) => void
}

export default function CollectionManager({ open, onClose, onSelectCollection }: Props) {
  const { collections, loadCollections, bumpCollectionRefresh } = useAppStore()
  const { message } = App.useApp()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#888890')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#888890')

  useEffect(() => {
    if (open) loadCollections()
  }, [open])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      await api.createCollection({ name: trimmed, color })
      setName('')
      setColor('#888890')
      bumpCollectionRefresh()
      loadCollections()
      message.success('收藏集已创建')
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '创建失败，请检查后端是否正常运行')
    }
  }

  const handleDelete = async (id: number) => {
    await api.deleteCollection(id)
    bumpCollectionRefresh()
    loadCollections()
  }

  const startEdit = (c: Collection) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditColor(c.color)
  }

  const handleUpdate = async () => {
    if (editingId == null) return
    await api.updateCollection(editingId, { name: editName.trim(), color: editColor })
    setEditingId(null)
    bumpCollectionRefresh()
    loadCollections()
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="管理收藏集"
      width={420}
    >
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <ColorPicker value={color} onChange={(c) => setColor(c.toHexString())} />
        <Input
          placeholder="新建收藏集..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={handleCreate}
        />
        <Button icon={<PlusOutlined />} onClick={handleCreate}>添加</Button>
      </Space.Compact>

      {collections.length === 0 ? (
        <Empty description="还没有收藏集" />
      ) : (
        <List
          dataSource={collections}
          renderItem={(c: Collection) => (
            <List.Item
              style={{ cursor: onSelectCollection ? 'pointer' : undefined }}
              onClick={() => onSelectCollection?.(c)}
              actions={[
                editingId === c.id ? (
                  <Space key="edit" size={4}>
                    <ColorPicker value={editColor} onChange={(v) => setEditColor(v.toHexString())} />
                    <Input size="small" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: 120 }} onPressEnter={handleUpdate} />
                    <Button size="small" onClick={handleUpdate}>保存</Button>
                  </Space>
                ) : (
                  <Button key="edit" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); startEdit(c) }} />
                ),
                <Popconfirm key="del" title="删除收藏集？" description="文件不会被删除" onConfirm={(e) => { e?.stopPropagation(); handleDelete(c.id) }} onCancel={(e) => e?.stopPropagation()}>
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                </Popconfirm>
              ]}
            >
              <Space>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                <Text>{c.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>({c.item_count})</Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
