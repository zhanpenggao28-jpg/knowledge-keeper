import { useRef, useState, useEffect, useCallback, memo } from 'react'
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
  onRename: (item: Item) => void
  onRenameSubmit?: (item: Item, newName: string) => Promise<boolean>
}

const ZOOM_LEVELS = [
  { xl: 2, lg: 3, md: 3, sm: 4, xs: 6 },   // 0: tiny
  { xl: 3, lg: 4, md: 4, sm: 6, xs: 8 },    // 1: small
  { xl: 4, lg: 6, md: 8, sm: 12, xs: 24 },  // 2: default
  { xl: 6, lg: 8, md: 8, sm: 12, xs: 24 },  // 3: medium
  { xl: 8, lg: 12, md: 12, sm: 24, xs: 24 }, // 4: large
  { xl: 12, lg: 12, md: 24, sm: 24, xs: 24 }, // 5: x-large
  { xl: 24, lg: 24, md: 24, sm: 24, xs: 24 }, // 6: xx-large
]

const ItemGrid = memo(function ItemGrid({ items, onItemClick, onDelete, onReprocess, onEditTags, onRename, onRenameSubmit }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const [selecting, setSelecting] = useState(false)
  const [zoom, setZoom] = useState(2)

  const selectingRef = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const toggleSelect = useAppStore(s => s.toggleSelect)
  const clearSelection = useAppStore(s => s.clearSelection)

  // ---- Alt + wheel zoom ----
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.altKey) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -1 : 1
    setZoom(z => Math.max(0, Math.min(ZOOM_LEVELS.length - 1, z + delta)))
  }, [])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    grid.addEventListener('wheel', handleWheel, { passive: false })
    return () => grid.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ---- Rubber-band selection ----
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.ant-card, button, .ant-checkbox, .ant-checkbox-wrapper, .ant-tag, .ant-dropdown')) return

    e.preventDefault()
    const grid = gridRef.current
    if (!grid) return

    const r = grid.getBoundingClientRect()
    startPos.current = { x: e.clientX, y: e.clientY }

    // Show the selection box via direct DOM (no re-render)
    if (boxRef.current) {
      boxRef.current.style.display = 'block'
      boxRef.current.style.left = `${e.clientX - r.left}px`
      boxRef.current.style.top = `${e.clientY - r.top}px`
      boxRef.current.style.width = '0px'
      boxRef.current.style.height = '0px'
    }

    selectingRef.current = true
    setSelecting(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectingRef.current) return

    // Use rAF to throttle DOM updates — avoids layout thrashing
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const grid = gridRef.current
      const box = boxRef.current
      if (!grid || !box) return

      const r = grid.getBoundingClientRect()
      const x1 = Math.min(startPos.current.x, e.clientX)
      const y1 = Math.min(startPos.current.y, e.clientY)
      const x2 = Math.max(startPos.current.x, e.clientX)
      const y2 = Math.max(startPos.current.y, e.clientY)

      box.style.left = `${x1 - r.left}px`
      box.style.top = `${y1 - r.top}px`
      box.style.width = `${x2 - x1}px`
      box.style.height = `${y2 - y1}px`
    })
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!selectingRef.current) return
    selectingRef.current = false
    setSelecting(false)

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const grid = gridRef.current
    const box = boxRef.current
    if (!grid || !box) return

    // Hide the selection box
    box.style.display = 'none'

    // Only register as a selection if the user actually moved
    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)
    if (dx < 4 && dy < 4) {
      // Click on empty space → clear selection
      clearSelection()
      return
    }

    // Determine selection rectangle in page coordinates
    const x1 = Math.min(startPos.current.x, e.clientX)
    const y1 = Math.min(startPos.current.y, e.clientY)
    const x2 = Math.max(startPos.current.x, e.clientX)
    const y2 = Math.max(startPos.current.y, e.clientY)

    // Without Ctrl: replace selection. With Ctrl: add to selection.
    if (!e.ctrlKey && !e.metaKey) {
      clearSelection()
    }

    const cards = grid.querySelectorAll<HTMLElement>('[data-item-id]')
    const selectedIds = useAppStore.getState().selectedIds
    cards.forEach(el => {
      const cr = el.getBoundingClientRect()
      // Rectangle intersection: select if the box touches any part of the card
      const hits = !(cr.right < x1 || cr.left > x2 || cr.bottom < y1 || cr.top > y2)
      if (hits) {
        const id = el.getAttribute('data-item-id')
        if (id) {
          const isSelected = selectedIds.has(id)
          if (!isSelected) toggleSelect(id)
        }
      }
    })
  }

  const cols = ZOOM_LEVELS[zoom]

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
      style={{ position: 'relative', userSelect: 'none', minHeight: 200, overflowY: 'auto' }}
    >
      <Row gutter={[16, 16]}>
        {items.map(item => (
          <Col key={item.id} xs={cols.xs} sm={cols.sm} md={cols.md} lg={cols.lg} xl={cols.xl}>
            <div data-item-id={item.id}>
              <ItemCard
                item={item}
                onClick={() => onItemClick(item)}
                onDelete={onDelete}
                onReprocess={onReprocess}
                onEditTags={onEditTags}
                onRename={onRename}
                onRenameSubmit={onRenameSubmit}
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* Selection box — positioned via direct DOM in mousemove for smoothness */}
      <div
        ref={boxRef}
        style={{
          display: 'none',
          position: 'absolute',
          background: selecting ? 'rgba(200, 168, 78, 0.12)' : 'transparent',
          border: selecting ? '1px dashed var(--accent)' : 'none',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />
    </div>
  )
})

export default ItemGrid
