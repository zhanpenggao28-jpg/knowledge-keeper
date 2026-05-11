import { useState, useCallback, useEffect } from 'react'
import { Button, Space, Dropdown, App } from 'antd'
import {
  PlusOutlined, AppstoreOutlined, UnorderedListOutlined, RobotOutlined,
  SortAscendingOutlined, QuestionCircleOutlined, ScanOutlined, InboxOutlined
} from '@ant-design/icons'
import ImportDialog from '../library/ImportDialog'
import ChatPanel from './ChatPanel'
import ShortcutHelp from '../library/ShortcutHelp'
import DuplicateManager from '../library/DuplicateManager'
import { useAppStore } from '../../stores/appStore'
import { useDragImport } from '../../hooks/useDragImport'

const SORT_OPTIONS = [
  { label: '创建时间', value: 'created_at' },
  { label: '文件名', value: 'title' },
  { label: '文件大小', value: 'file_size' },
  { label: '文件类型', value: 'file_type' },
]

export default function Header() {
  const { viewMode, setViewMode, sortBy, sortOrder, setSortBy, setSortOrder, loadItems } = useAppStore()
  const [importOpen, setImportOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [dupOpen, setDupOpen] = useState(false)
  const { message } = App.useApp()

  // Visual drag indicator — actual import handled by main process via will-navigate
  const isDragging = useDragImport(() => {})

  // Listen for drop completion from native handler (index.html) or main process
  useEffect(() => {
    const msgHandler = (e: MessageEvent) => {
      if (e.data?.type === 'native-drop-ok') {
        if (e.data.error) {
          message.error({ content: '导入失败: ' + e.data.error, key: 'drag-import' })
        } else {
          message.success({ content: `成功导入 ${e.data.count} 个文件`, key: 'drag-import' })
          loadItems()
        }
      }
    }
    window.addEventListener('message', msgHandler)

    if (!window.electronAPI) return () => window.removeEventListener('message', msgHandler)
    const unsub = window.electronAPI.onDropImportComplete((result) => {
      if (result.error) {
        message.error({ content: '导入失败: ' + result.error, key: 'drag-import' })
      } else {
        message.success({ content: `成功导入 ${result.count} 个文件`, key: 'drag-import' })
        loadItems()
      }
    })

    return () => {
      window.removeEventListener('message', msgHandler)
      unsub()
    }
  }, [message, loadItems])

  const sortMenuItems = SORT_OPTIONS.map(opt => ({
    key: opt.value,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {opt.label}
        {sortBy === opt.value && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
      </span>
    ),
    onClick: () => {
      if (sortBy === opt.value) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSortBy(opt.value)
      }
    }
  }))

  return (
    <>
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
          <Dropdown menu={{ items: sortMenuItems }} trigger={['click']}>
            <Button icon={<SortAscendingOutlined />}>
              {SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? '排序'}
            </Button>
          </Dropdown>
          <Button icon={<ScanOutlined />} onClick={() => setDupOpen(true)}>
            检测重复
          </Button>
          <Button icon={<RobotOutlined />} onClick={() => setChatOpen(true)}>
            AI 助手
          </Button>
        </Space>

        <div style={{ flex: 1 }} />

        <Button
          type="text"
          icon={<QuestionCircleOutlined />}
          onClick={() => setHelpOpen(true)}
          title="快捷键说明"
        />

        <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
        <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
        <DuplicateManager open={dupOpen} onClose={() => setDupOpen(false)} />
      </div>

      {/* Drop zone overlay */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(200,168,78,0.15)',
            border: '3px dashed var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            backdropFilter: 'blur(2px)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <InboxOutlined style={{ fontSize: 64, color: 'var(--accent)' }} />
            <div style={{ fontSize: 20, color: 'var(--accent)', marginTop: 12, fontWeight: 600 }}>
              释放文件以导入
            </div>
          </div>
        </div>
      )}
    </>
  )
}
