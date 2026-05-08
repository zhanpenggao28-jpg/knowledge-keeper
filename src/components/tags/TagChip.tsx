import { Tag } from 'antd'
import type { Tag as TagType } from '../../types'

interface Props {
  tag: TagType
  closable?: boolean
  onClose?: (tag: TagType) => void
}

export default function TagChip({ tag, closable = false, onClose }: Props) {
  return (
    <Tag
      color={tag.color}
      closable={closable}
      onClose={onClose ? () => onClose(tag) : undefined}
    >
      {tag.name}
    </Tag>
  )
}
