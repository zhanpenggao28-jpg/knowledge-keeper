import { useState, useMemo } from 'react'
import { Modal, Input, ColorPicker, List, Button, Space, Popconfirm, Empty, App } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useTags } from '../../hooks/useTags'
import { useAppStore } from '../../stores/appStore'
import type { Tag } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  onSelectTag?: (tag: Tag) => void
  selectedTagIds?: number[]
}

export default function TagManager({ open, onClose, onSelectTag, selectedTagIds }: Props) {
  const { tags, create, update, remove } = useTags()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#1677ff')
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [search, setSearch] = useState('')
  const { message } = App.useApp()

  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags
    const q = search.toLowerCase()
    return tags.filter(t => t.name.toLowerCase().includes(q))
  }, [tags, search])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await create(newName.trim(), newColor)
      useAppStore.getState().bumpTagRefresh()
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
      useAppStore.getState().bumpTagRefresh()
      message.success('标签已删除')
    } catch {
      message.error('删除失败')
    }
  }

  const startEdit = (tag: Tag) => {
    setEditingTag(tag)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const cancelEdit = () => {
    setEditingTag(null)
    setEditName('')
    setEditColor('')
  }

  const saveEdit = async () => {
    if (!editingTag || !editName.trim()) return
    try {
      await update(editingTag.id, { name: editName.trim(), color: editColor })
      useAppStore.getState().bumpTagRefresh()
      message.success('标签已更新')
      cancelEdit()
    } catch {
      message.error('更新失败')
    }
  }

  return (
    <Modal
      title="标签管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnClose
    >
      {/* Create new tag */}
      <Space style={{ width: '100%', marginBottom: 12 }}>
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

      {/* Search filter */}
      <Input
        placeholder="搜索标签..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 12 }}
      />

      {filteredTags.length === 0 ? (
        <Empty description={search ? '无匹配标签' : '暂无标签'} />
      ) : (
        <List
          dataSource={filteredTags}
          renderItem={tag => {
            const isEditing = editingTag?.id === tag.id
            const isSelected = selectedTagIds?.includes(tag.id)
            return (
              <List.Item
                style={isSelected ? { background: 'rgba(212,182,95,0.12)' } : undefined}
                actions={[
                  <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(tag)} />,
                  <Popconfirm key="del" title="确定删除此标签？" onConfirm={() => handleDelete(tag.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ]}
              >
                {isEditing ? (
                  <Space style={{ width: '100%' }}>
                    <ColorPicker value={editColor} onChange={(c) => setEditColor(c.toHexString())} />
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onPressEnter={saveEdit}
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <Button size="small" type="primary" icon={<CheckOutlined />} onClick={saveEdit} />
                    <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit} />
                  </Space>
                ) : (
                  <Space
                    style={{ cursor: onSelectTag ? 'pointer' : undefined }}
                    onClick={() => onSelectTag?.(tag)}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: tag.color }} />
                    <span>{tag.name}</span>
                    {tag.is_ai_generated ? <span style={{ fontSize: 11, color: '#999' }}>AI</span> : null}
                    <span style={{ color: '#999', fontSize: 12 }}>({tag.item_count ?? 0})</span>
                    {isSelected && <span style={{ color: '#d4b65f', fontSize: 12 }}>✓ 已选</span>}
                  </Space>
                )}
              </List.Item>
            )
          }}
        />
      )}
    </Modal>
  )
}
