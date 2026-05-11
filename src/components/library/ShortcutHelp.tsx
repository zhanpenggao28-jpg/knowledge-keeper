import { Modal, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface ShortcutRow {
  key: string
  shortcut: string
  action: string
}

const shortcuts: ShortcutRow[] = [
  { key: '1', shortcut: 'Escape', action: '取消选择' },
  { key: '2', shortcut: 'Ctrl + A', action: '全选所有文件' },
  { key: '3', shortcut: 'Ctrl + F', action: '聚焦搜索框' },
  { key: '4', shortcut: 'Space', action: '预览选中文件' },
  { key: '5', shortcut: 'Delete', action: '删除选中文件（需确认）' },
  { key: '6', shortcut: 'F2', action: '重命名选中文件' },
  { key: '7', shortcut: 'Ctrl + E', action: '导出选中文件' },
  { key: '8', shortcut: 'Ctrl + I', action: '打开导入对话框' },
  { key: '9', shortcut: '?', action: '显示此快捷键帮助' },
  { key: '10', shortcut: '双击文件名', action: '行内重命名' },
  { key: '11', shortcut: '拖出文件到桌面', action: '从应用中导出文件' },
  { key: '12', shortcut: '拖入文件到窗口', action: '导入文件' },
]

const columns: ColumnsType<ShortcutRow> = [
  { title: '快捷键', dataIndex: 'shortcut', key: 'shortcut', width: 200,
    render: (s: string) => <code style={{ background: 'var(--bg-base)', padding: '2px 8px', borderRadius: 4 }}>{s}</code>
  },
  { title: '操作', dataIndex: 'action', key: 'action' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function ShortcutHelp({ open, onClose }: Props) {
  return (
    <Modal
      title="快捷键说明"
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <Table
        dataSource={shortcuts}
        columns={columns}
        pagination={false}
        size="small"
        style={{ marginTop: 8 }}
      />
    </Modal>
  )
}
