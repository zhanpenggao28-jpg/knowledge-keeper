import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, App } from 'antd'
import {
  HomeOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  PlusOutlined,
  TagsOutlined
} from '@ant-design/icons'
import { useTags } from '../../hooks/useTags'
import { useAppStore } from '../../stores/appStore'
import { addItemsToCollection, addItemsToTag } from '../../services/api'
import { useState, useEffect } from 'react'
import CollectionManager from '../library/CollectionManager'
import TagManager from '../tags/TagManager'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tags } = useTags()
  const {
    activeTagId, setTagFilter,
    activeCollectionId, setCollectionFilter,
    collections, loadCollections, bumpCollectionRefresh, collectionRefreshKey
  } = useAppStore()
  const { message } = App.useApp()
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [tagDragOverId, setTagDragOverId] = useState<number | null>(null)

  useEffect(() => {
    loadCollections()
  }, [])

  useEffect(() => {
    loadCollections()
  }, [collectionRefreshKey])

  const currentPath = location.pathname

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/library', icon: <FolderOpenOutlined />, label: '文件库' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置' },
  ]

  const getSelectedKeys = () => {
    if (activeTagId || activeCollectionId) return []
    return [currentPath]
  }

  const sectionLabel = (title: string, onAdd?: () => void) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 12px 8px'
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em'
      }}>{title}</span>
      {onAdd && (
        <PlusOutlined
          style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={onAdd}
        />
      )}
    </div>
  )

  return (
    <div style={{ padding: '16px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 24px 20px', fontWeight: 600, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        知识管家
      </div>
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        items={menuItems}
        onClick={({ key }) => {
          setCollectionFilter(null) // clears both activeCollectionId and activeTagId, calls loadItems once
          navigate(key)
        }}
        style={{ borderRight: 0, flexShrink: 0 }}
      />

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 12px',
        borderTop: '1px solid var(--border)'
      }}>
        {/* Collections section */}
        {sectionLabel('收藏集', () => setCollectionOpen(true))}
        {collections.length === 0 && (
          <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            暂无收藏集，点击 + 创建
          </div>
        )}
        {collections.map(col => {
          const active = activeCollectionId === col.id
          const isDragOver = dragOverId === col.id
          return (
            <div
              key={col.id}
              onClick={() => {
                setCollectionFilter(active ? null : col.id)
                navigate('/library')
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverId(col.id)
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={async (e) => {
                e.preventDefault()
                setDragOverId(null)
                try {
                  const raw = e.dataTransfer.getData('application/x-item-ids')
                  const storeIds = useAppStore.getState().draggedItemIds
                  const ids: string[] = raw ? JSON.parse(raw) : storeIds
                  if (ids.length > 0) {
                    await addItemsToCollection(col.id, ids)
                    message.success(`已添加 ${ids.length} 个文件到「${col.name}」`)
                    bumpCollectionRefresh()
                    loadCollections()
                  }
                } catch { /* no data */ }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                marginBottom: 2,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: 13,
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                background: isDragOver ? 'var(--accent-dim)' : active ? 'var(--accent-dim)' : 'transparent',
                outline: isDragOver ? '1px dashed var(--accent)' : 'none',
                transition: 'all 0.15s',
                userSelect: 'none'
              }}
              onMouseEnter={e => {
                if (!active && !isDragOver) e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (!active && !isDragOver) e.currentTarget.style.background = 'transparent'
                setDragOverId(prev => prev === col.id ? null : prev)
              }}
              onContextMenu={e => {
                e.preventDefault()
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: col.color,
                flexShrink: 0
              }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {col.item_count ?? 0}
              </span>
            </div>
          )
        })}

        {/* Tags section — always visible */}
        {sectionLabel('标签', () => setTagOpen(true))}
        {tags.length === 0 && (
          <div style={{
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            textAlign: 'center',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            margin: '4px 0'
          }}>
            <TagsOutlined style={{ marginRight: 6 }} />
            暂无标签，点击 + 创建
          </div>
        )}
        {tags.map(tag => {
          const active = activeTagId === tag.id
          const isTagDragOver = tagDragOverId === tag.id
          return (
            <div
              key={tag.id}
              onClick={() => {
                setTagFilter(active ? null : tag.id)
                navigate('/library')
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setTagDragOverId(tag.id)
              }}
              onDragLeave={() => setTagDragOverId(null)}
              onDrop={async (e) => {
                e.preventDefault()
                setTagDragOverId(null)
                try {
                  const raw = e.dataTransfer.getData('application/x-item-ids')
                  const storeIds = useAppStore.getState().draggedItemIds
                  const ids: string[] = raw ? JSON.parse(raw) : storeIds
                  if (ids.length > 0) {
                    await addItemsToTag(tag.id, ids)
                    message.success(`已添加 ${ids.length} 个文件到标签「${tag.name}」`)
                    useAppStore.getState().loadItems()
                  }
                } catch { /* no data */ }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                marginBottom: 2,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: 13,
                color: active ? tag.color : 'var(--text-secondary)',
                background: isTagDragOver ? 'var(--accent-dim)' : active ? `${tag.color}14` : 'transparent',
                outline: isTagDragOver ? '1px dashed var(--accent)' : 'none',
                transition: 'all 0.15s',
                userSelect: 'none'
              }}
              onMouseEnter={e => {
                if (!active && !isTagDragOver) e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (!active && !isTagDragOver) e.currentTarget.style.background = 'transparent'
                setTagDragOverId(prev => prev === tag.id ? null : prev)
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: tag.color,
                flexShrink: 0
              }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tag.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {tag.item_count ?? 0}
              </span>
            </div>
          )
        })}
      </div>

      <CollectionManager open={collectionOpen} onClose={() => setCollectionOpen(false)} />
      <TagManager open={tagOpen} onClose={() => setTagOpen(false)} />
    </div>
  )
}
