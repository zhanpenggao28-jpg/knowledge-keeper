import { Button, Space, Typography, App } from 'antd'
import { DeleteOutlined, ExportOutlined, CloseOutlined, SelectOutlined } from '@ant-design/icons'
import { useAppStore } from '../../stores/appStore'
import { deleteItem } from '../../services/api'

const { Text } = Typography

interface Props {
  onRefresh: () => void
}

export default function BatchToolbar({ onRefresh }: Props) {
  const { selectedIds, clearSelection, selectAll, items } = useAppStore()
  const { message, modal } = App.useApp()

  const count = selectedIds.size
  if (count === 0) return null

  const handleDelete = () => {
    modal.confirm({
      title: `确认删除 ${count} 个文件？`,
      content: '此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const ids = Array.from(selectedIds)
        let done = 0
        for (const id of ids) {
          try { await deleteItem(id); done++ } catch { /* skip */ }
        }
        message.success(`已删除 ${done} 个文件`)
        clearSelection()
        onRefresh()
      }
    })
  }

  const handleExport = async () => {
    if (!window.electronAPI) return
    const dir = await window.electronAPI.selectDirectory()
    if (!dir) return

    // Copy each selected file to target directory
    const ids = Array.from(selectedIds)
    const selected = items.filter(i => ids.includes(i.id))
    let done = 0
    for (const item of selected) {
      try {
        // We use drag to export by opening the storage folder
        await window.electronAPI.dragFile(item.file_path, item.original_path)
      } catch { /* skip */ }
    }
    // For batch export, open the storage location for each file
    window.electronAPI.openInExplorer(selected[0]?.file_path || '', selected[0]?.original_path)
    message.info('请从打开的文件夹中拖出文件')
    clearSelection()
  }

  const handleSelectAll = () => {
    selectAll(items.map(i => i.id))
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: '#2a2218',
      border: '1px solid #826f42',
      borderRadius: 12,
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
    }}>
      <Text style={{ color: '#d4b65f', fontWeight: 600 }}>
        已选 {count} 项
      </Text>

      <Space>
        <Button size="small" icon={<SelectOutlined />} onClick={handleSelectAll}>
          全选
        </Button>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
        >
          删除
        </Button>
        <Button
          size="small"
          icon={<ExportOutlined />}
          onClick={handleExport}
          disabled={!window.electronAPI}
        >
          导出
        </Button>
        <Button
          size="small"
          icon={<CloseOutlined />}
          onClick={clearSelection}
        >
          取消
        </Button>
      </Space>
    </div>
  )
}
