import { useNavigate, useLocation } from 'react-router-dom'
import { Menu } from 'antd'
import {
  HomeOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  SettingOutlined,
  TagOutlined
} from '@ant-design/icons'
import { useTags } from '../../hooks/useTags'
import { useAppStore } from '../../stores/appStore'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tags } = useTags()
  const { activeTagId, setTagFilter } = useAppStore()

  const currentPath = location.pathname

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/library', icon: <FolderOpenOutlined />, label: '文件库' },
    { key: '/search', icon: <SearchOutlined />, label: '搜索' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置' },
  ]

  const tagItems = tags.map(tag => ({
    key: `tag-${tag.id}`,
    icon: <TagOutlined style={{ color: tag.color }} />,
    label: `${tag.name} (${tag.item_count ?? 0})`
  }))

  const getSelectedKeys = () => {
    if (activeTagId) return [`tag-${activeTagId}`]
    return [currentPath]
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ padding: '0 24px 16px', fontWeight: 700, fontSize: 18, color: '#1677ff' }}>
        知识管家
      </div>
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        items={[
          ...menuItems,
          ...(tagItems.length > 0
            ? [{ type: 'divider' as const }, { type: 'group' as const, label: '标签', children: tagItems }]
            : [])
        ]}
        onClick={({ key }) => {
          if (key.startsWith('tag-')) {
            const tagId = parseInt(key.replace('tag-', ''), 10)
            setTagFilter(tagId)
            navigate('/library')
          } else {
            setTagFilter(null)
            navigate(key)
          }
        }}
        style={{ borderRight: 0 }}
      />
    </div>
  )
}
