import { useState } from 'react'
import { Modal, Input, ColorPicker, List, Button, Space, Popconfirm, Empty, App } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useTags } from '../../hooks/useTags'
import type { Tag } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onSelectTag?: (tag: Tag) => void
}

export default function TagManager({ open, onClose, onSelectTag }: Props) {
  const { tags, create, update, remove } = useTags()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#1677ff')
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const { message } = App.useApp()

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await create(newName.trim(), newColor)
      setNewName('')
      setNewColor('#1677ff')
      message.success('标签创建成功')
    } catch {
      message.error('标签创建失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await remove(id)
      message.success('标签已删除')
    } catch {
      message.error('删除失败')
    }
  }

  return (
    <Modal
      title="标签管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Space style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="新标签名"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={handleCreate}
          style={{ flex: 1 }}
        />
        <ColorPicker value={newColor} onChange={(c) => setNewColor(c.toHexString())} />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>添加</Button>
      </Space>

      {tags.length === 0 ? (
        <Empty description="暂无标签" />
      ) : (
        <List
          dataSource={tags}
          renderItem={tag => (
            <List.Item
              actions={[
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditingTag(tag)} />,
                <Popconfirm title="确定删除此标签？" onConfirm={() => handleDelete(tag.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ]}
            >
              <Space
                style={{ cursor: onSelectTag ? 'pointer' : undefined }}
                onClick={() => onSelectTag?.(tag)}
              >
                <div style={{ width: 16, height: 16, borderRadius: 4, background: tag.color }} />
                <span>{tag.name}</span>
                {tag.is_ai_generated ? <span style={{ fontSize: 11, color: '#999' }}>AI</span> : null}
                <span style={{ color: '#999', fontSize: 12 }}>({tag.item_count ?? 0})</span>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
