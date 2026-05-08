import { Row, Col, Empty } from 'antd'
import type { Item } from '../../types'
import ItemCard from './ItemCard'

interface Props {
  items: Item[]
  onItemClick: (item: Item) => void
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
  onEditTags: (item: Item) => void
}

export default function ItemGrid({ items, onItemClick, onDelete, onReprocess, onEditTags }: Props) {
  if (items.length === 0) {
    return <Empty description="还没有文件，点击右上角「导入文件」开始" />
  }

  return (
    <Row gutter={[16, 16]}>
      {items.map(item => (
        <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={4}>
          <ItemCard
            item={item}
            onClick={() => onItemClick(item)}
            onDelete={onDelete}
            onReprocess={onReprocess}
            onEditTags={onEditTags}
          />
        </Col>
      ))}
    </Row>
  )
}
