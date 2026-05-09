import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, App } from 'antd'
import {
  HomeOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { useTags } from '../../hooks/useTags'
import { useAppStore } from '../../stores/appStore'
import { addItemsToCollection } from '../../services/api'
import { useState, useEffect } from 'react'
import CollectionManager from '../library/CollectionManager'

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
  const [dragOverId, setDragOverId] = useState<number | null>(null)

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
          setTagFilter(null)
          setCollectionFilter(null)
          navigate(key)
        }}
        style={{ borderRight: 0, flexShrink: 0 }}
      />

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 12px',
        borderTop: (collections.length > 0 || tags.length > 0) ? '1px solid var(--border)' : 'none'
      }}>
        {/* Collections section */}
        {sectionLabel('收藏集', () => setCollectionOpen(true))}
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
                  const ids: string[] = raw ? JSON.parse(raw) : []
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

        {/* Tags section */}
        {tags.length > 0 && (
          <>
            {sectionLabel('标签')}
            {tags.map(tag => {
              const active = activeTagId === tag.id
              return (
                <div
                  key={tag.id}
                  onClick={() => {
                    setTagFilter(active ? null : tag.id)
                    navigate('/library')
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
                    background: active ? `${tag.color}14` : 'transparent',
                    transition: 'all 0.15s',
                    userSelect: 'none'
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.background = 'transparent'
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
          </>
        )}
      </div>

      <CollectionManager open={collectionOpen} onClose={() => setCollectionOpen(false)} />
    </div>
  )
}
