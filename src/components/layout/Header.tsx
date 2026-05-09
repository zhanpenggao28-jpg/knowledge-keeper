import { useState } from 'react'
import { Button, Space } from 'antd'
import { PlusOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons'
import ImportDialog from '../library/ImportDialog'
import { useAppStore } from '../../stores/appStore'

export default function Header() {
  const { viewMode, setViewMode } = useAppStore()
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div
      style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        background: 'var(--bg-surface)'
      }}
    >
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
