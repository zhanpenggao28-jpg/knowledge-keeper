import { useState } from 'react'
import { Button, Space } from 'antd'
import { PlusOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons'
import SearchBar from '../search/SearchBar'
import ImportDialog from '../library/ImportDialog'
import { useAppStore } from '../../stores/appStore'

export default function Header() {
  const { viewMode, setViewMode } = useAppStore()
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div
      style={{
        height: 56,
        borderBottom: '1px solid var(--border-color)',
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setImportOpen(true)}>
          导入文件
        </Button>
      </Space>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
