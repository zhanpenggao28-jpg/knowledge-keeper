import { useEffect, useRef } from 'react'
import type { Item } from '../types'

interface ShortcutConfig {
  items: Item[]
  selectedIds: Set<string>
  searchInputRef: React.RefObject<HTMLInputElement | { focus: () => void } | null>
  onClearSelection: () => void
  onSelectAll: (ids: string[]) => void
  onDeleteSelected: () => void
  onRenameFirst: () => void
  onExportSelected: () => void
  onPreview: () => void
  onOpenShortcutHelp: () => void
  onOpenImport: () => void
}

export function useKeyboardShortcuts(config: ShortcutConfig) {
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const c = configRef.current
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable

      // ? always opens help, even in inputs
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        c.onOpenShortcutHelp()
        return
      }

      // Skip other shortcuts when focused in input
      if (isInput) return

      if (e.key === 'Escape') {
        c.onClearSelection()
      }

      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        c.onSelectAll(c.items.map(i => i.id))
      }

      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        c.searchInputRef.current?.focus()
      }

      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault()
        c.onOpenImport()
      }

      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        c.onExportSelected()
      }

      if (e.key === ' ' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        c.onPreview()
      }

      if (e.key === 'Delete' && c.selectedIds.size > 0) {
        e.preventDefault()
        c.onDeleteSelected()
      }

      if (e.key === 'F2' && c.selectedIds.size === 1) {
        e.preventDefault()
        c.onRenameFirst()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
