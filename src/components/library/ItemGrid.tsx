import { useRef, useState } from 'react'
import { Row, Col, Empty } from 'antd'
import type { Item } from '../../types'
import { useAppStore } from '../../stores/appStore'
import ItemCard from './ItemCard'

interface Props {
  items: Item[]
  onItemClick: (item: Item) => void
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
  onEditTags: (item: Item) => void
}

export default function ItemGrid({ items, onItemClick, onDelete, onReprocess, onEditTags }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [selecting, setSelecting] = useState(false)
  const [box, setBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const gridRectRef = useRef<DOMRect | null>(null)
  const { toggleSelect } = useAppStore()

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.ant-card, button, .ant-checkbox, .ant-checkbox-wrapper, .ant-tag')) return

    e.preventDefault()
    const grid = gridRef.current
    if (!grid) return

    gridRectRef.current = grid.getBoundingClientRect()
    startPos.current = { x: e.clientX, y: e.clientY }
    lastPos.current = { x: e.clientX, y: e.clientY }
    setSelecting(true)
    const r = gridRectRef.current
    setBox({ x1: e.clientX - r.left, y1: e.clientY - r.top, x2: e.clientX - r.left, y2: e.clientY - r.top })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selecting || !startPos.current || !gridRectRef.current) return
    lastPos.current = { x: e.clientX, y: e.clientY }
    const r = gridRectRef.current
    const sx = startPos.current.x - r.left
    const sy = startPos.current.y - r.top
    const cx = e.clientX - r.left
    const cy = e.clientY - r.top

    setBox({
      x1: Math.min(sx, cx),
      y1: Math.min(sy, cy),
      x2: Math.max(sx, cx),
      y2: Math.max(sy, cy)
    })
  }

  const handleMouseUp = () => {
    if (!selecting || !startPos.current || !lastPos.current || !gridRectRef.current) {
      setSelecting(false); setBox(null); return
    }
    const grid = gridRef.current
    if (grid) {
      const r = gridRectRef.current
      const x1 = Math.min(startPos.current.x, lastPos.current.x)
      const y1 = Math.min(startPos.current.y, lastPos.current.y)
      const x2 = Math.max(startPos.current.x, lastPos.current.x)
      const y2 = Math.max(startPos.current.y, lastPos.current.y)

      const cards = grid.querySelectorAll<HTMLElement>('[data-item-id]')
      cards.forEach(el => {
        const cr = el.getBoundingClientRect()
        const cx = cr.left + cr.width / 2
        const cy = cr.top + cr.height / 2
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
          const id = el.getAttribute('data-item-id')
          if (id) toggleSelect(id)
        }
      })
    }
    setSelecting(false)
    setBox(null)
    startPos.current = null
    lastPos.current = null
    gridRectRef.current = null
  }

  if (items.length === 0) {
    return <Empty description="还没有文件，点击右上角「导入文件」开始" />
  }

  return (
    <div
      ref={gridRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ position: 'relative', userSelect: 'none', minHeight: 200 }}
    >
      <Row gutter={[16, 16]}>
        {items.map(item => (
          <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={4}>
            <div data-item-id={item.id}>
              <ItemCard
                item={item}
                onClick={() => onItemClick(item)}
                onDelete={onDelete}
                onReprocess={onReprocess}
                onEditTags={onEditTags}
              />
            </div>
          </Col>
        ))}
      </Row>

      {box && (
        <div style={{
          position: 'absolute',
          left: box.x1,
          top: box.y1,
          width: box.x2 - box.x1,
          height: box.y2 - box.y1,
          background: 'rgba(212, 182, 95, 0.12)',
          border: '1px dashed #d4b65f',
          pointerEvents: 'none',
          zIndex: 10
        }} />
      )}
    </div>
  )
}
