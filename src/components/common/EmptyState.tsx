import { Empty, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

interface Props {
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  description = '暂无内容',
  actionLabel = '导入文件',
  onAction
}: Props) {
  return (
    <Empty description={description}>
      {actionLabel && onAction && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Empty>
  )
}
