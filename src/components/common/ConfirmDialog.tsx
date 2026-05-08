import { Modal } from 'antd'

interface Props {
  open: boolean
  title: string
  content: string
  onOk: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmDialog({ open, title, content, onOk, onCancel, danger }: Props) {
  return (
    <Modal
      open={open}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      okButtonProps={{ danger }}
      okText="确定"
      cancelText="取消"
    >
      <p>{content}</p>
    </Modal>
  )
}
