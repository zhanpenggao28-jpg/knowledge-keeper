import { Button, Space, Badge } from 'antd'
import { PlusOutlined, AppstoreOutlined, UnorderedListOutlined, FileTextOutlined } from '@ant-design/icons'
import SearchBar from '../search/SearchBar'
import { useAppStore } from '../../stores/appStore'

export default function Header() {
  const { viewMode, setViewMode } = useAppStore()

  const handleImport = async () => {
    if (window.electronAPI) {
      await window.electronAPI.importFiles()
      useAppStore.getState().loadItems()
    }
  }

  return (
    <div
      style={{
        height: 56,
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16
      }}
    >
      <SearchBar />

      <Space>
        <Button
          icon={<AppstoreOutlined />}
          type={viewMode === 'grid' ? 'primary' : 'default'}
          onClick={() => setViewMode('grid')}
        />
        <Button
          icon={<UnorderedListOutlined />}
          type={viewMode === 'list' ? 'primary' : 'default'}
          onClick={() => setViewMode('list')}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleImport}>
          导入文件
        </Button>
      </Space>
    </div>
  )
}
